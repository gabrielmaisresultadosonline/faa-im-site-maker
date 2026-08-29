import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { getPlan, PLAN_KEYS, type PlanKey } from "@/lib/plan-catalog";

const PaymentInput = z.object({
  // Somente a CHAVE do plano vem do cliente. Preco/duracao sao derivados no servidor.
  planKey: z.enum(PLAN_KEYS as [PlanKey, ...PlanKey[]]),
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email(),
  customerPhone: z.string().max(40).optional().nullable(),
  redirectUrl: z.string().url(),
  webhookUrl: z.string().url(),
  currency: z.enum(["BRL", "USD"]).default("BRL"),
});

/**
 * Gera o link de pagamento conforme o idioma/moeda:
 * - USD (pagina /ingles)  -> Stripe Checkout
 * - BRL (homepage em PT)  -> InfinitePay
 * Preco e duracao SEMPRE vem do catalogo server-side (src/lib/plan-catalog.ts),
 * impedindo adulteracao do valor cobrado ou do tempo de assinatura.
 */
export const createPaymentLink = createServerFn({ method: "POST" })
  .inputValidator((data) => PaymentInput.parse(data))
  .handler(async ({ data }) => {
    const { requireSessionUser } = await import('./session.server');
    const { query } = await import('./db.server');
    const userId = (await requireSessionUser(getRequest())).id;


    const plan = getPlan(data.currency, data.planKey);
    const priceCents = plan.priceCents;
    const planDurationDays = plan.durationDays;
    const planName = plan.name;

    const orderNsu = `order-${Date.now()}-${crypto.randomUUID()}`;

    if (data.currency === "USD") {
      const stripeKey = process.env["STRIPE_SECRET_KEY"];
      if (!stripeKey) throw new Error("Stripe is not configured");

      const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          success_url: `${data.redirectUrl}?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: data.redirectUrl,
          mode: "payment",
          customer_email: data.customerEmail,
          "line_items[0][price_data][currency]": "usd",
          "line_items[0][price_data][product_data][name]": `LOVABLACK - ${planName}`,
          "line_items[0][price_data][unit_amount]": priceCents.toString(),
          "line_items[0][quantity]": "1",
          "metadata[user_id]": userId,
          "metadata[order_nsu]": orderNsu,
          "metadata[plan_key]": data.planKey,
          "metadata[plan_name]": planName,
          "metadata[plan_duration_days]": planDurationDays.toString(),
          "payment_method_types[0]": "card",
        }).toString(),
      });

      const session = (await response.json()) as {
        id?: string;
        url?: string;
        error?: { message?: string };
      };

      if (!response.ok || !session.url) {
        console.error("Stripe error:", session.error);
        throw new Error("Failed to create the Stripe checkout session");
      }

      await query(`INSERT INTO transactions(user_id,order_nsu,amount,plan_name,plan_duration_days,payment_link,status,currency,provider,session_id) VALUES($1,$2,$3,$4,$5,$6,'pending','USD','stripe',$7)`,[userId,orderNsu,priceCents,planName,planDurationDays,session.url,session.id??null]);

      return { url: session.url };
    }

    // BRL -> InfinitePay
    // Omitimos phone_number completamente se não for válido para evitar erro 422
    let formattedPhone: string | undefined = undefined;
    if (data.customerPhone) {
      const digits = data.customerPhone.replace(/\D/g, "");
      // InfinitePay espera formato E.164 (+5511999999999)
      if (digits.length >= 10 && digits.length <= 11) {
        formattedPhone = `+55${digits}`;
      } else if (digits.length > 11 && digits.length <= 15) {
        formattedPhone = `+${digits}`;
      }
      // Se não cair em nenhum padrão válido, formattedPhone permanece undefined
      // e o campo será removido do payload abaixo.
    }

    const payload: any = {
      handle: "paguemro",
      order_nsu: orderNsu,
      redirect_url: data.redirectUrl,
      webhook_url: data.webhookUrl,
      customer: {
        name: data.customerName,
        email: data.customerEmail,
      },
      items: [
        { quantity: 1, price: priceCents, description: `LOVABLACK - ${planName}` },
      ],
    };

    if (formattedPhone) {
      payload.customer.phone_number = formattedPhone;
    }

    // Endpoint Checkout Integrado (POST https://api.checkout.infinitepay.io/links)
    const response = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("InfinitePay Error Payload:", JSON.stringify(payload, null, 2));
      console.error("InfinitePay Response Status:", response.status);
      console.error("InfinitePay Response Body:", errorText);
      
      // Se deu 404 no endpoint de checkout, tentamos os outros endpoints como fallback
      if (response.status === 404) {
        console.log("Endpoint api.checkout.infinitepay.io/links deu 404, tentando fallbacks...");
        
        const fallbacks = [
          "https://api.infinitepay.io/v1/checkout/links",
          "https://api.infinitepay.io/v1/links"
        ];

        for (const url of fallbacks) {
          try {
            const altResponse = await fetch(url, {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json",
              },
              body: JSON.stringify(payload),
            });

            if (altResponse.ok) {
              const altResult = (await altResponse.json()) as { url?: string };
              if (altResult.url) {
                await query(`INSERT INTO transactions(user_id,order_nsu,amount,plan_name,plan_duration_days,payment_link,status,currency,provider) VALUES($1,$2,$3,$4,$5,$6,'pending','BRL','infinitepay')`,[userId,orderNsu,priceCents,planName,planDurationDays,altResult.url]);
                return { url: altResult.url };
              }
            }
          } catch (e) {
            console.error(`Fallback failed for ${url}:`, e);
          }
        }
        
        throw new Error(`InfinitePay API Error 404: Endpoint não encontrado. Verifique se o seu Handle (${payload.handle}) está correto no App InfinitePay e se o Checkout Integrado está habilitado.`);
      }

      throw new Error(`InfinitePay API Error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const result = (await response.json()) as { url?: string };

    if (!result.url) {
      console.error("InfinitePay Empty URL:", result);
      throw new Error("InfinitePay retornou sucesso, mas sem link de pagamento (URL vazia).");
    }

    await query(`INSERT INTO transactions(user_id,order_nsu,amount,plan_name,plan_duration_days,payment_link,status,currency,provider) VALUES($1,$2,$3,$4,$5,$6,'pending','BRL','infinitepay')`,[userId,orderNsu,priceCents,planName,planDurationDays,result.url]);

    return { url: result.url };
  });

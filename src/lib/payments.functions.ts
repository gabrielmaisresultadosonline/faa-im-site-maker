import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PaymentInput = z.object({
  planName: z.string().min(1),
  priceCents: z.number().int().positive(),
  planDurationDays: z.number().int().positive(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  redirectUrl: z.string().url(),
  webhookUrl: z.string().url(),
  currency: z.enum(["BRL", "USD"]).default("BRL"),
});

/**
 * Gera o link de pagamento conforme o idioma/moeda:
 * - USD (pagina /ingles)  -> Stripe Checkout
 * - BRL (homepage em PT)  -> InfinitePay
 * Toda transacao e registrada em `infinitepay_transactions` com provider/currency,
 * para que o painel /admin liste as vendas dos dois canais.
 */
export const createPaymentLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => PaymentInput.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const orderNsu = `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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
          "line_items[0][price_data][product_data][name]": `LOVABLACK - ${data.planName}`,
          "line_items[0][price_data][unit_amount]": data.priceCents.toString(),
          "line_items[0][quantity]": "1",
          "metadata[user_id]": userId,
          "metadata[order_nsu]": orderNsu,
          "metadata[plan_name]": data.planName,
          "metadata[plan_duration_days]": data.planDurationDays.toString(),
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

      await supabaseAdmin.from("infinitepay_transactions").insert({
        user_id: userId,
        order_nsu: orderNsu,
        amount: data.priceCents,
        plan_name: data.planName,
        plan_duration_days: data.planDurationDays,
        payment_link: session.url,
        status: "pending",
        currency: "USD",
        provider: "stripe",
        session_id: session.id ?? null,
      });

      return { url: session.url };
    }

    // BRL -> InfinitePay
    const payload = {
      handle: "paguemro",
      order_nsu: orderNsu,
      redirect_url: data.redirectUrl,
      webhook_url: data.webhookUrl,
      customer: {
        name: data.customerName,
        email: data.customerEmail,
        phone_number: data.customerPhone,
      },
      items: [
        { quantity: 1, price: data.priceCents, description: `LOVABLACK - ${data.planName}` },
      ],
    };

    const response = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as { url?: string };

    if (!response.ok || !result.url) {
      console.error("InfinitePay Error:", result);
      throw new Error("Falha ao gerar link de pagamento");
    }

    await supabaseAdmin.from("infinitepay_transactions").insert({
      user_id: userId,
      order_nsu: orderNsu,
      amount: data.priceCents,
      plan_name: data.planName,
      plan_duration_days: data.planDurationDays,
      payment_link: result.url,
      status: "pending",
      currency: "BRL",
      provider: "infinitepay",
    });

    return { url: result.url };
  });

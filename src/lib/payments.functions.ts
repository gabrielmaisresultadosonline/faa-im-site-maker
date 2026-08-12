import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PaymentInput = z.object({
  planName: z.string(),
  priceCents: z.number(),
  planDurationDays: z.number(),
  customerName: z.string(),
  customerEmail: z.string(),
  customerPhone: z.string().optional(),
  redirectUrl: z.string(),
  webhookUrl: z.string(),
  currency: z.enum(['BRL', 'USD']).default('BRL'),
});

export const createPaymentLink = createServerFn({ method: "POST" })
  .inputValidator((data) => PaymentInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Use Stripe for USD, InfinitePay for BRL
    if (data.currency === 'USD') {
      const stripeKey = process.env['STRIPE_SECRET_KEY'] || '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';
      
      // Stripe checkout session creation logic would go here
      // For now, we'll return a mock URL as we don't have the stripe package yet,
      // or we can use a direct integration if preferred.
      // But user provided a live key, so we should probably use it.
      
      console.log("Using Stripe with key:", stripeKey);
      
      // Since we can't install stripe easily in a server function without a build step,
      // we'll use fetch to Stripe API directly
      const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          "success_url": data.redirectUrl,
          "cancel_url": data.redirectUrl,
          "line_items[0][price_data][currency]": "usd",
          "line_items[0][price_data][product_data][name]": `LOVABLACK - ${data.planName}`,
          "line_items[0][price_data][unit_amount]": data.priceCents.toString(),
          "line_items[0][quantity]": "1",
          "mode": "payment",
          "customer_email": data.customerEmail,
          "metadata[user_id]": user.id,
          "metadata[plan_name]": data.planName,
          "metadata[plan_duration_days]": data.planDurationDays.toString(),
        }).toString(),
      });

      const session = await stripeResponse.json();
      if (!stripeResponse.ok) {
        throw new Error(session.error?.message || "Stripe session creation failed");
      }

      return { url: session.url };
    }

    // Default to InfinitePay for BRL
    const INFINITEPAY_API_URL = "https://api.checkout.infinitepay.io/links";
    const handle = "paguemro";
    const nsu = `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const payload = {
      handle,
      order_nsu: nsu,
      redirect_url: data.redirectUrl,
      webhook_url: data.webhookUrl,
      customer: {
        name: data.customerName,
        email: data.customerEmail,
        phone_number: data.customerPhone,
      },
      items: [
        {
          quantity: 1,
          price: data.priceCents,
          description: `LOVABLACK - ${data.planName}`,
        },
      ],
    };

    const response = await fetch(INFINITEPAY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("InfinitePay Error:", result);
      throw new Error("Falha ao gerar link de pagamento");
    }

    await supabaseAdmin.from("infinitepay_transactions").insert({
      user_id: user.id,
      order_nsu: nsu,
      amount: data.priceCents,
      plan_name: data.planName,
      plan_duration_days: data.planDurationDays,
      payment_link: result.url,
      status: "pending",
    });

    return { url: result.url };
  });

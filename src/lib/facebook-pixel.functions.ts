import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const FB_PIXEL_ID = process.env['FB_PIXEL_ID'];
const FB_ACCESS_TOKEN = process.env['FB_ACCESS_TOKEN'];

async function sendFBEvent(eventName: string, userData: any, customData: any = {}) {
  if (!FB_PIXEL_ID || !FB_ACCESS_TOKEN) {
    console.warn("FB Pixel ID or Access Token missing. Skipping event:", eventName);
    return;
  }

  try {
    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website",
          user_data: {
            client_ip_address: userData.ip,
            client_user_agent: userData.userAgent,
            em: userData.email ? [userData.email] : undefined, // FB expects hashed email usually, but API can handle some raw or you hash it
          },
          custom_data: customData,
        },
      ],
    };

    const url = `https://graph.facebook.com/v17.0/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("FB Conversion API error:", result);
    }
  } catch (error) {
    console.error("Failed to send FB event:", error);
  }
}

export const trackLeadEvent = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ 
    email: z.string().optional(),
    ip: z.string().optional(),
    userAgent: z.string().optional()
  }).parse(data))
  .handler(async ({ data }) => {
    await sendFBEvent("Lead", data);
    return { success: true };
  });

export const trackPurchaseEvent = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ 
    email: z.string().optional(),
    ip: z.string().optional(),
    userAgent: z.string().optional(),
    value: z.number(),
    currency: z.string()
  }).parse(data))
  .handler(async ({ data }) => {
    await sendFBEvent("Purchase", data, {
      value: data.value,
      currency: data.currency
    });
    return { success: true };
  });

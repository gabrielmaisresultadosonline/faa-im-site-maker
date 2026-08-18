import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const checkRegistrationIP = createServerFn({ method: "GET" })
  .handler(async ({ request }) => {
    // Get IP from headers
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(',')[0].trim() : "unknown";
    
    if (ip === "unknown" || ip === "127.0.0.1") {
      return { blocked: false, ip: "unknown" };
    }

    // Check if user is admin - admins bypass IP check
    // However, we don't have a session here since this is BEFORE signup.
    
    // Count profiles with this IP
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('registration_ip', ip);

    if (error) {
      console.error("Error checking IP registration:", error);
      return { blocked: false, ip };
    }

    // Limit is 3 (so if 3 already exist, block the 4th)
    const MAX_ACCOUNTS_PER_IP = 2; // User said 2 a 3, so I'll allow 2, block 3rd.
    
    if (count && count >= MAX_ACCOUNTS_PER_IP) {
      return { 
        blocked: true, 
        ip,
        message: "Notamos que você já cadastrou várias vezes com e-mail diferente, por isso seu acesso está bloqueado de criar novas contas. Pode usar as contas que já tinha criado e comprar um plano."
      };
    }

    return { blocked: false, ip };
  });

import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getRequest } from "@tanstack/react-start/server";

export const checkRegistrationIP = createServerFn({ method: "GET" })
  .handler(async () => {
    const request = getRequest();
    if (!request) return { blocked: false, ip: "unknown" };

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? (forwarded.split(',')[0]?.trim() || "unknown") : "unknown";
    
    if (ip === "unknown" || ip === "127.0.0.1") {
      return { blocked: false, ip: "unknown" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('registration_ip', ip);

    if (error) {
      console.error("Error checking IP registration:", error);
      return { blocked: false, ip };
    }

    const MAX_ACCOUNTS_PER_IP = 2;
    
    if (count && count >= MAX_ACCOUNTS_PER_IP) {
      return { 
        blocked: true, 
        ip,
        message: "Notamos que você já cadastrou várias vezes com e-mail diferente, por isso seu acesso está bloqueado de criar novas contas. Pode usar as contas que já tinha criado e comprar um plano."
      };
    }

    return { blocked: false, ip };
  });


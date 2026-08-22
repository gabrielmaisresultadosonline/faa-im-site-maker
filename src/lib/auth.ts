import { supabase } from "@/integrations/supabase/client";

export const getSubscriptionStatus = async (userId: string) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  
  if (!data) return null;

  // Vitalício ou planos sem expiração (expires_at nulo) são considerados ativos.
  // Também adicionamos uma margem de segurança de 5 minutos.
  const now = new Date();
  now.setMinutes(now.getMinutes() - 5);
  
  const isExpired = data.expires_at ? new Date(data.expires_at) < now : false;
  
  return {
    ...data,
    isExpired
  };
};

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

export const isAdmin = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  if (error) return false;
  return !!data;
};

export const getAppSettings = async () => {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*');

  if (error) throw error;
  
  const settings: Record<string, any> = {};
  data.forEach(item => {
    settings[item.key] = item.value;
  });
  
  return settings;
};

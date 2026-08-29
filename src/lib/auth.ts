import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';

export interface ProfileDto { id: string; email: string; full_name: string; whatsapp: string | null; language: 'pt' | 'en'; access_password: string; blocked: boolean; custom_message: string; last_login_at: string | null; last_heartbeat_at: string | null; registration_ip: string | null; created_at: string }
export interface SubscriptionDto { id: string; user_id: string; type: string; status: string; expires_at: string | null; created_at: string; updated_at: string; isExpired: boolean }
type SettingValue = string | number | boolean | null | SettingValue[] | { [key: string]: SettingValue };

export const getProfile = createServerFn({ method: 'GET' }).inputValidator((data) => z.object({ userId: z.string().optional() }).optional().parse(data)).handler(async () => {
  const { requireSessionUser } = await import('./session.server');
  const { query } = await import('./db.server');
  const user = await requireSessionUser(getRequest());
  const rows = await query<ProfileDto>(`SELECT id,email,full_name,whatsapp,language,access_password,
    blocked,custom_message,last_login_at,last_heartbeat_at,registration_ip,created_at FROM users WHERE id=$1`, [user.id]);
  return rows[0] ?? null;
});

export const getSubscriptionStatus = createServerFn({ method: 'GET' }).inputValidator((data) => z.object({ userId: z.string().optional() }).optional().parse(data)).handler(async () => {
  const { requireSessionUser } = await import('./session.server');
  const { query } = await import('./db.server');
  const user = await requireSessionUser(getRequest());
  const rows = await query<Omit<SubscriptionDto, 'isExpired'>>(
    'SELECT * FROM subscriptions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1', [user.id]);
  const subscription = rows[0];
  if (!subscription) return null;
  const expiry = subscription.expires_at ? new Date(subscription.expires_at).getTime() : Number.POSITIVE_INFINITY;
  return { ...subscription, isExpired: subscription.status !== 'active' || expiry + 300_000 <= Date.now() };
});

export const getAppSettings = createServerFn({ method: 'GET' }).handler(async () => {
  const { query } = await import('./db.server');
  const rows = await query<{ key: string; value: SettingValue }>('SELECT key,value FROM app_settings');
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
});

export const isAdmin = createServerFn({ method: 'GET' }).inputValidator((data) => z.object({ userId: z.string().optional() }).optional().parse(data)).handler(async () => {
  const { getSessionUser } = await import('./session.server');
  return (await getSessionUser(getRequest()))?.role === 'admin';
});

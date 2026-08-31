import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

export const checkRegistrationIP = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest();
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  if (ip === 'unknown' || ip === '127.0.0.1') return { blocked: false, ip };
  const { isIpAllowlisted } = await import('./ip-allowlist.server');
  if (await isIpAllowlisted(ip)) return { blocked: false, ip };
  const { query } = await import('./db.server');
  const rows = await query<{ count: string }>('SELECT count(*)::text count FROM users WHERE registration_ip=$1::inet', [ip]);
  const blocked = Number(rows[0]?.count ?? 0) >= 2;
  return { blocked, ip, message: blocked ? 'Notamos que você já cadastrou várias vezes com e-mail diferente. Use uma conta existente para comprar um plano.' : undefined };
});

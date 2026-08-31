import { query } from './db.server';

/**
 * Retorna true quando o IP está liberado no /admin (app_settings.ip_allowlist),
 * ou seja, isento do limite de contas por IP.
 */
export async function isIpAllowlisted(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  try {
    const rows = await query<{ value: unknown }>("SELECT value FROM app_settings WHERE key='ip_allowlist'");
    const value = rows[0]?.value;
    const list = Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(/[\s,;]+/)
        : [];
    return list.map((item) => String(item).trim()).filter(Boolean).includes(ip.trim());
  } catch (error) {
    // Falha ao ler a configuração não pode liberar cadastros indevidamente.
    console.error('[ip-allowlist]', error);
    return false;
  }
}

import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';

const Table = z.enum(['subscriptions','transactions','app_settings','extension_notices','extension_docs']);
const Operation = z.object({
  table: Table,
  action: z.enum(['select','insert','update','delete']),
  values: z.record(z.unknown()).optional(),
  filters: z.record(z.string()).default({}),
  order: z.object({ column: z.string(), ascending: z.boolean() }).optional(),
});

const columns: Record<z.infer<typeof Table>, Set<string>> = {
  subscriptions: new Set(['id','user_id','type','status','expires_at','created_at','updated_at']),
  transactions: new Set(['id','user_id','order_nsu','amount','plan_name','plan_duration_days','payment_link','status','currency','provider','session_id','transaction_nsu','invoice_slug','created_at','updated_at']),
  app_settings: new Set(['key','value','updated_at']),
  extension_notices: new Set(['id','extension_id','notice_type','content_type','content','image_thumb_url','is_active','created_at']),
  extension_docs: new Set(['id','extension_id','title','content','created_at','updated_at']),
};

export const adminData = createServerFn({ method: 'POST' })
  .inputValidator((input) => Operation.parse(input))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import('./session.server');
    const { query } = await import('./db.server');
    await requireAdmin(getRequest());
    const allowed = columns[data.table];
    const filterEntries = Object.entries(data.filters).filter(([key]) => allowed.has(key));
    if (filterEntries.length !== Object.keys(data.filters).length) throw new Error('Filtro inválido');
    const whereValues = filterEntries.map(([, value]) => value);
    const where = filterEntries.length ? ` WHERE ${filterEntries.map(([key], index) => `${key}=$${index + 1}`).join(' AND ')}` : '';
    if (data.action === 'select') {
      const order = data.order && allowed.has(data.order.column) ? ` ORDER BY ${data.order.column} ${data.order.ascending ? 'ASC' : 'DESC'}` : '';
      return query<Record<string, string | number | boolean | null>>( `SELECT * FROM ${data.table}${where}${order}`, whereValues);
    }
    if (data.action === 'delete') {
      if (!where) throw new Error('Exclusão sem filtro não permitida');
      await query(`DELETE FROM ${data.table}${where}`, whereValues);
      return [];
    }
    const entries = Object.entries(data.values ?? {}).filter(([key]) => allowed.has(key));
    if (!entries.length) throw new Error('Dados inválidos');

    // app_settings.value é jsonb: precisa serializar e fazer upsert (a chave pode ainda não existir).
    if (data.table === 'app_settings' && (data.action === 'update' || data.action === 'insert')) {
      const key = data.filters['key'] ?? (data.values?.['key'] as string | undefined);
      if (!key) throw new Error('Chave da configuração ausente');
      const value = 'value' in (data.values ?? {}) ? data.values!['value'] : null;
      await query(
        `INSERT INTO app_settings(key,value) VALUES($1,$2::jsonb)
         ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`,
        [key, JSON.stringify(value ?? null)],
      );
      return [];
    }

    if (data.action === 'insert') {
      const names = entries.map(([key]) => key).join(',');
      const placeholders = entries.map((_, index) => `$${index + 1}`).join(',');
      await query(`INSERT INTO ${data.table}(${names}) VALUES(${placeholders})`, entries.map(([, value]) => value));
      return [];
    }
    if (!where) throw new Error('Atualização sem filtro não permitida');
    const set = entries.map(([key], index) => `${key}=$${index + 1}`).join(',');
    await query(`UPDATE ${data.table} SET ${set},updated_at=now()${where.replaceAll(/\$(\d+)/g, (_, n: string) => `$${Number(n) + entries.length}`)}`, [...entries.map(([, value]) => value), ...whereValues]);
    return [];
  });

export const uploadAsset = createServerFn({ method: 'POST' })
  .inputValidator((input) => {
    if (!(input instanceof FormData)) throw new Error('Upload inválido');
    return input;
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import('./session.server');
    await requireAdmin(getRequest());
    const file = data.get('file');
    if (!(file instanceof File)) throw new Error('Arquivo ausente');
    const max = file.type === 'video/mp4' ? 300 * 1024 * 1024 : 30 * 1024 * 1024;
    if (file.size > max) throw new Error('Arquivo excede o limite');
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const name = `${crypto.randomUUID()}-${safe}`;
    const { mkdir, writeFile } = await import('node:fs/promises');
    const { resolve } = await import('node:path');
    const root = resolve(process.env['UPLOAD_DIR'] ?? '/var/lib/lovablack/uploads');
    await mkdir(root, { recursive: true });
    await writeFile(resolve(root, name), Buffer.from(await file.arrayBuffer()));
    return { path: name, url: `/api/media/${encodeURIComponent(name)}` };
  });

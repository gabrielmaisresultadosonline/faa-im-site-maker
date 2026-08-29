import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/media/$name')({
  server: { handlers: { GET: async ({ request, params }) => {
    const { getSessionUser } = await import('@/lib/session.server');
    if (!(await getSessionUser(request))) return new Response('Unauthorized', { status: 401 });
    const name = params.name.replace(/[^a-zA-Z0-9._-]/g, '');
    const { readFile } = await import('node:fs/promises');
    const { resolve, extname } = await import('node:path');
    try {
      const file = await readFile(resolve(process.env['UPLOAD_DIR'] ?? '/var/lib/lovablack/uploads', name));
      const types: Record<string,string> = { '.zip':'application/zip','.mp4':'video/mp4','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp' };
      return new Response(new Uint8Array(file), { headers: { 'Content-Type': types[extname(name).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': 'private, max-age=3600', 'Accept-Ranges': 'bytes' } });
    } catch { return new Response('Not found', { status: 404 }); }
  } } },
});
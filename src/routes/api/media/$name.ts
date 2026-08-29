import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/media/$name')({
  server: { handlers: { GET: async ({ request, params }) => {
    const { getSessionUser } = await import('@/lib/session.server');
    if (!(await getSessionUser(request))) return new Response('Unauthorized', { status: 401 });
    const name = params.name.replace(/[^a-zA-Z0-9._-]/g, '');
    const { readFile, stat } = await import('node:fs/promises');
    const { resolve, extname } = await import('node:path');
    try {
      const path = resolve(process.env['UPLOAD_DIR'] ?? '/var/lib/lovablack/uploads', name);
      const types: Record<string,string> = { '.zip':'application/zip','.mp4':'video/mp4','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp' };
      const size = (await stat(path)).size;
      const range = request.headers.get('range');
      const common = { 'Content-Type': types[extname(name).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': 'private, max-age=3600', 'Accept-Ranges': 'bytes' };
      if (range) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(range);
        if (!match) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
        const start = Number(match[1]);
        const end = Math.min(match[2] ? Number(match[2]) : start + 1024 * 1024 - 1, size - 1);
        if (start >= size || end < start) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
        const file = await readFile(path); const chunk = file.subarray(start, end + 1);
        return new Response(new Uint8Array(chunk), { status: 206, headers: { ...common, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(chunk.length) } });
      }
      const file = await readFile(path);
      return new Response(new Uint8Array(file), { headers: { ...common, 'Content-Length': String(size) } });
    } catch { return new Response('Not found', { status: 404 }); }
  } } },
});
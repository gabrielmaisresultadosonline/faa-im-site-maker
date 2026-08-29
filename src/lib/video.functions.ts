import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';

export const getSignedVideoUrl = createServerFn({ method: 'GET' })
  .inputValidator((data) => z.object({ path: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { requireSessionUser } = await import('./session.server');
    await requireSessionUser(getRequest());
    const clean = data.path.replaceAll('\\', '/').split('/').filter(Boolean).at(-1) ?? '';
    if (!clean || clean.includes('..')) return { url: '', error: 'INVALID_VIDEO_PATH' as const };
    return { url: `/api/media/${encodeURIComponent(clean)}` };
  });
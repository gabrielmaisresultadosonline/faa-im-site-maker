import { useQuery } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { getAppSettings } from '@/lib/auth';
import { cn } from '@/lib/utils';

export interface CommunityBannerProps {
  className?: string;
  lang?: 'pt' | 'en';
}

/**
 * Faixa de convite para a comunidade no WhatsApp.
 * O link é configurado no /admin (chave `community_link` em app_settings).
 * Se nenhum link estiver salvo, o banner simplesmente não é renderizado.
 */
export function CommunityBanner({ className, lang = 'pt' }: CommunityBannerProps) {
  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: getAppSettings,
    staleTime: 60_000,
  });

  const link = typeof settings?.['community_link'] === 'string' ? (settings['community_link'] as string).trim() : '';
  if (!link) return null;

  const title = lang === 'en' ? 'JOIN OUR COMMUNITY!' : 'PARTICIPE DA NOSSA COMUNIDADE!';
  const subtitle =
    lang === 'en'
      ? 'Updates, support and tips directly on WhatsApp.'
      : 'Novidades, suporte e dicas direto no WhatsApp.';

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={title}
      className={cn(
        'group flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 rounded-3xl border-2 border-[#25D366] bg-[#25D366]/10 px-6 py-6 sm:py-8 text-center transition-colors hover:bg-[#25D366]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]',
        className,
      )}
    >
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-lg">
        <MessageCircle className="h-9 w-9" aria-hidden="true" />
      </span>
      <span className="flex flex-col items-center sm:items-start">
        <span className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-[#128C3E]">{title}</span>
        <span className="text-sm sm:text-base font-medium text-neutral-600">{subtitle}</span>
      </span>
    </a>
  );
}

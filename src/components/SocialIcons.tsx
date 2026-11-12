import { FaInstagram, FaFacebookF, FaYoutube } from 'react-icons/fa';
import { SOCIAL } from '@/lib/site';

const ICONS = { Instagram: FaInstagram, Facebook: FaFacebookF, YouTube: FaYoutube } as const;

export default function SocialIcons({ className = '', iconClass = 'h-4 w-4' }: { className?: string; iconClass?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {SOCIAL.map((s) => {
        const Icon = ICONS[s.name];
        return (
          <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`ICFC on ${s.name}`}
            className="opacity-90 transition hover:opacity-100 hover:text-secondary">
            <Icon className={iconClass} />
          </a>
        );
      })}
    </div>
  );
}

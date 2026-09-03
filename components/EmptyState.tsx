import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-300 rounded-2xl py-16 px-8 bg-gray-50/60 animate-fade-in">
      <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center mb-4 animate-scale-in">
        <Icon className="w-7 h-7 text-gray-400" />
      </div>
      <h3
        className="text-lg text-gray-900 mb-1.5 font-[family-name:var(--font-fraunces)] animate-fade-slide-in"
        style={{ animationDelay: '80ms' }}
      >
        {title}
      </h3>
      <p
        className="text-sm text-gray-500 max-w-sm mb-6 animate-fade-slide-in"
        style={{ animationDelay: '140ms' }}
      >
        {description}
      </p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-all active:scale-95 animate-fade-slide-in"
          style={{ animationDelay: '200ms' }}
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
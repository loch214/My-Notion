import React from 'react';
import { cn } from '../../lib/utils';

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  category?: string;
  actions?: React.ReactNode;
  /** Larger typography for home and similar overview pages */
  size?: 'default' | 'comfortable';
}

export function SectionHeader({
  className,
  title,
  subtitle,
  category,
  actions,
  size = 'default',
  ...props
}: SectionHeaderProps) {
  const comfortable = size === 'comfortable';

  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
      {...props}
    >
      <div className="space-y-1.5">
        {category && (
          <p
            className={cn(
              'uppercase tracking-[0.24em] text-[color:var(--muted)] font-medium',
              comfortable ? 'text-xs' : 'text-[10px]'
            )}
          >
            {category}
          </p>
        )}
        <h1
          className={cn(
            'font-semibold tracking-tight text-[color:var(--text)]',
            comfortable ? 'text-4xl sm:text-[2.75rem]' : 'text-3xl'
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={cn(
              'max-w-2xl text-[color:var(--muted)] leading-relaxed',
              comfortable ? 'text-base sm:text-lg' : 'text-sm'
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-end">
          {actions}
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { cn } from '../../lib/utils';

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  category?: string;
  actions?: React.ReactNode;
}

export function SectionHeader({
  className,
  title,
  subtitle,
  category,
  actions,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
      {...props}
    >
      <div className="space-y-1">
        {category && (
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)] font-medium">
            {category}
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--text)]">
          {title}
        </h1>
        {subtitle && (
          <p className="max-w-2xl text-sm text-[color:var(--muted)] leading-relaxed">
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

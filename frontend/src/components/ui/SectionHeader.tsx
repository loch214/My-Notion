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
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
      {...props}
    >
      <div>
        <h1
          className="text-3xl font-bold tracking-tight text-[color:var(--text)]"
        >
          {title}
        </h1>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-end">
          {actions}
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  tabClassName?: string;
}

export function Tabs({
  tabs,
  activeId,
  onChange,
  className,
  tabClassName,
}: TabsProps) {
  return (
    <div className={cn('relative flex w-full min-w-0 border-b border-[color:var(--border)] pb-2', className)}>
      <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-colors focus-visible:outline-none shrink-0',
                isActive
                  ? 'text-[color:var(--on-accent)] font-semibold'
                  : 'text-[color:var(--muted)] hover:text-[color:var(--text)]',
                tabClassName
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabBackground"
                  className="absolute inset-0 bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] rounded-full -z-10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              {tab.icon && <span className="flex shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

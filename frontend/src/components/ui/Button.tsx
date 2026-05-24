import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/50 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';
    
    const variants = {
      primary: 'bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] text-[color:var(--on-accent)] border border-white/10 hover:brightness-110 shadow-sm active:from-[color:var(--accent-2)] active:to-[color:var(--accent)]',
      secondary: 'bg-[color:var(--surface-med)] hover:bg-[color:var(--surface-high)] text-[color:var(--text)] border border-[color:var(--border)] active:bg-[color:var(--surface-low)]',
      ghost: 'bg-transparent hover:bg-[color:var(--surface-low)] text-[color:var(--text)] active:bg-[color:var(--surface-med)]',
      danger: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 active:bg-rose-500/30',
    };

    const sizes = {
      sm: 'h-8 px-3.5 text-xs gap-1.5',
      md: 'h-10 px-5 text-sm gap-2',
      lg: 'h-12 px-7 text-base gap-2.5',
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...(props as any)}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {!isLoading && leftIcon && <span className="flex shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="flex shrink-0">{rightIcon}</span>}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

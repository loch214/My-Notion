import React from 'react';
import { cn } from '../../lib/utils';

// --- Input Component ---
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-low)] px-4 py-2.5 text-sm text-[color:var(--text)] transition-all duration-150 ease placeholder:text-[color:var(--muted)] hover:border-[color:var(--border-focus)]/30 focus:border-[color:var(--border-focus)] focus:ring-2 focus:ring-[color:var(--accent)]/15 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500' : '',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

// --- Textarea Component ---
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, rows = 4, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[96px] w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-low)] px-4 py-3 text-sm text-[color:var(--text)] transition-all duration-150 ease placeholder:text-[color:var(--muted)] hover:border-[color:var(--border-focus)]/30 focus:border-[color:var(--border-focus)] focus:ring-2 focus:ring-[color:var(--accent)]/15 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-y',
          error ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500' : '',
          className
        )}
        ref={ref}
        rows={rows}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

// --- Select Component ---
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          className={cn(
            'flex h-11 w-full appearance-none rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-low)] px-4 py-2.5 pr-10 text-sm text-[color:var(--text)] transition-all duration-150 ease hover:border-[color:var(--border-focus)]/30 focus:border-[color:var(--border-focus)] focus:ring-2 focus:ring-[color:var(--accent)]/15 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500' : '',
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[color:var(--muted)]">
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    );
  }
);
Select.displayName = 'Select';

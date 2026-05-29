import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export interface DropdownOption {
  id: string;
  label: string;
  badge?: string;
}

export interface DropdownProps {
  options: DropdownOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  triggerClassName?: string;
  menuClassName?: string;
  placeholder?: string;
}

export function Dropdown({
  options,
  selectedId,
  onSelect,
  triggerClassName,
  menuClassName,
  placeholder = 'Select option',
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = options.find((opt) => opt.id === selectedId);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!isOpen || !dropdownRef.current) {
      setMenuStyle(null);
      return;
    }

    const updateMenuPosition = () => {
      const rect = dropdownRef.current?.getBoundingClientRect();
      if (!rect) return;

      const width = Math.max(rect.width, 180);
      const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
      const top = rect.bottom + 8;

      setMenuStyle({
        position: 'fixed',
        left,
        top,
        width,
        zIndex: 10000,
      });
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative inline-block w-full text-left">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-low)] px-4 py-2 text-sm text-[color:var(--text)] transition-all duration-150 ease hover:border-[color:var(--border-focus)]/30 focus:border-[color:var(--border-focus)] focus:ring-2 focus:ring-[color:var(--accent)]/15 focus:outline-none',
          triggerClassName
        )}
      >
        <span className="truncate">
          {selectedOption ? (
            <>
              {selectedOption.label}
              {selectedOption.badge && (
                <span className="ml-1.5 text-xs text-[color:var(--muted)]">· {selectedOption.badge}</span>
              )}
            </>
          ) : (
            placeholder
          )}
        </span>
        <svg
          className={cn('h-4 w-4 text-[color:var(--muted)] transition-all duration-150 ease', isOpen ? 'rotate-180' : '')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && menuStyle
        ? ReactDOM.createPortal(
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                style={menuStyle}
                className={cn(
                  'overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-high)] p-1.5 shadow-lg shadow-black/35 focus:outline-none',
                  menuClassName
                )}
              >
                <div className="space-y-0.5">
                  {options.map((option) => {
                    const isSelected = option.id === selectedId;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          onSelect(option.id);
                          setIsOpen(false);
                        }}
                        className={cn(
                          'flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm transition-all duration-150 ease',
                          isSelected
                            ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)] font-medium'
                            : 'text-[color:var(--text)] hover:bg-[color:var(--surface-low)] hover:text-[color:var(--text)]'
                        )}
                      >
                        <span className="truncate">{option.label}</span>
                        {option.badge && (
                          <span className={cn('ml-2 text-xs', isSelected ? 'text-[color:var(--on-accent)]/80' : 'text-[color:var(--muted)]')}>
                            {option.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>,
            document.body
          )
        : null}
    </div>
  );
}

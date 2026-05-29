import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidthClassName?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClassName = 'max-w-lg',
}: ModalProps) {
  
  // Disable body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Support escape key close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

   return ReactDOM.createPortal(
     <AnimatePresence>
       <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px]"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className={cn(
            'relative z-10 w-full rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface-med)] p-6 shadow-2xl shadow-black/40 focus:outline-none flex flex-col max-h-[90vh] overflow-hidden',
            maxWidthClassName
          )}
        >
          <div className="mb-6 flex items-start justify-between gap-4 shrink-0">
            <div>
              {subtitle && (
                <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)] mb-0.5">{subtitle}</p>
              )}
              <h2 className="text-xl font-semibold text-[color:var(--text)] tracking-tight">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-full text-[color:var(--muted)] transition-all duration-150 ease hover:bg-[color:var(--surface-low)] hover:text-[color:var(--text)]"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-visible pr-1 -mr-1">
            {children}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

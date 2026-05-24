import React, { useRef } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  spotlight?: boolean;
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, spotlight = true, interactive = false, children, ...props }, ref) => {
    const cardRef = useRef<HTMLDivElement | null>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!spotlight || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      cardRef.current.style.setProperty('--mouse-x', `${x}px`);
      cardRef.current.style.setProperty('--mouse-y', `${y}px`);
    };

    // Combine ref callbacks
    const setRefs = (node: HTMLDivElement | null) => {
      cardRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as any).current = node;
      }
    };

    return (
      <div
        ref={setRefs}
        onMouseMove={handleMouseMove}
        className={cn(
          'relative rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-med)] transition-all duration-300 overflow-hidden',
          spotlight ? 'spotlight-card' : '',
          interactive ? 'hover:-translate-y-0.5 hover:border-[color:var(--border-focus)] hover:shadow-md cursor-pointer' : '',
          className
        )}
        {...props}
      >
        <div className="relative z-10 w-full h-full">{children}</div>
      </div>
    );
  }
);

Card.displayName = 'Card';

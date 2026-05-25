import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidthClassName?: string;
  animate?: boolean;
}

export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, maxWidthClassName = 'max-w-[1400px]', animate = true, children, ...props }, ref) => {
    if (animate) {
      return (
        <motion.div
          ref={ref as any}
          className={cn(
            'mx-auto w-full min-w-0 pb-6',
            maxWidthClassName,
            className
          )}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' as any }}
          {...(props as any)}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'mx-auto w-full min-w-0 pb-6',
          maxWidthClassName,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

PageContainer.displayName = 'PageContainer';

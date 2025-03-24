'use client';

import * as React from 'react';
import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ToastProps {
  id: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: (id: string) => void;
}

type ToastPropsWithHTMLAttrs = ToastProps & Omit<HTMLMotionProps<"div">, keyof ToastProps>;

export const Toast = React.forwardRef<
  HTMLDivElement,
  ToastPropsWithHTMLAttrs
>(({ className, id, title, description, action, type = 'info', duration = 5000, onClose, ...props }, ref) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />
  };

  const bgColors = {
    success: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50',
    error: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50',
    info: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(
        'group pointer-events-auto relative flex w-full max-w-md items-center justify-between space-x-4 overflow-hidden rounded-lg border p-4 shadow-lg',
        bgColors[type],
        className
      )}
      ref={ref}
      {...props}
    >
      <div className="flex items-start gap-3">
        {icons[type]}
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">{title}</h3>
          {description && (
            <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{description}</div>
          )}
        </div>
      </div>

      {action && <div>{action}</div>}

      <button
        onClick={() => onClose(id)}
        className="absolute top-2 right-2 rounded-md p-1 text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <span className="sr-only">Close</span>
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
});
Toast.displayName = 'Toast';

// ToastContainer to render all toasts
export function ToastContainer({ 
  toasts, 
  onClose 
}: { 
  toasts: ToastProps[];
  onClose: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-0 right-0 z-50 flex flex-col gap-2 p-4 md:max-w-sm md:bottom-4 md:right-4">
      <AnimatePresence>
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
} 
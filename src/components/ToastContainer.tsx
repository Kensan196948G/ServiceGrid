import * as React from 'react';
const { memo, useMemo } = React;
import Toast from './Toast';
import { useToast } from '../hooks/useToast';

interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
  spacing?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ToastContainer = memo<ToastContainerProps>(({ 
  position = 'top-right',
  maxToasts = 5,
  spacing = 'md',
  className = ''
}) => {
  const { toasts, removeToast } = useToast();

  const positionClasses = useMemo(() => ({
    'top-right': 'fixed top-4 right-4',
    'top-left': 'fixed top-4 left-4',
    'bottom-right': 'fixed bottom-4 right-4',
    'bottom-left': 'fixed bottom-4 left-4',
    'top-center': 'fixed top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'fixed bottom-4 left-1/2 transform -translate-x-1/2',
  }), []);

  const spacingClasses = useMemo(() => ({
    sm: 'space-y-1',
    md: 'space-y-2',
    lg: 'space-y-3',
  }), []);

  const containerClasses = useMemo(() => {
    const classes = [
      positionClasses[position],
      'z-50 max-w-sm w-full',
      spacingClasses[spacing],
      className
    ];
    return classes.filter(Boolean).join(' ');
  }, [position, spacing, className, positionClasses, spacingClasses]);

  // Limit the number of visible toasts
  const visibleToasts = useMemo(() => {
    return toasts.slice(0, maxToasts);
  }, [toasts, maxToasts]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div 
      className={containerClasses}
      role="region"
      aria-label="通知エリア"
      aria-live="polite"
      aria-relevant="additions removals"
    >
      {visibleToasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={removeToast}
          duration={toast.duration}
          persist={toast.persist}
          showIcon={toast.showIcon}
        />
      ))}
      
      {/* Show count of hidden toasts if any */}
      {toasts.length > maxToasts && (
        <div className="text-xs text-slate-500 text-center py-2">
          +{toasts.length - maxToasts}件の通知があります
        </div>
      )}
    </div>
  );
});

ToastContainer.displayName = 'ToastContainer';

export default ToastContainer;

// Export the component with default props for easy usage
export const DefaultToastContainer = memo(() => (
  <ToastContainer position="top-right" maxToasts={5} spacing="md" />
));

DefaultToastContainer.displayName = 'DefaultToastContainer';
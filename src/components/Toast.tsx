import * as React from 'react';
const { memo, useCallback, useEffect, useState, useMemo } = React;

interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: (id: string) => void;
  duration?: number;
  persist?: boolean;
  showIcon?: boolean;
  className?: string;
}

const Toast = memo<ToastProps>(({ 
  id, 
  message, 
  type, 
  onClose, 
  duration = 5000,
  persist = false,
  showIcon = true,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  const typeStyles = useMemo(() => ({
    success: 'bg-green-500 text-white border-l-4 border-green-700',
    error: 'bg-red-500 text-white border-l-4 border-red-700',
    warning: 'bg-yellow-500 text-black border-l-4 border-yellow-700',
    info: 'bg-blue-500 text-white border-l-4 border-blue-700',
  }), []);

  const iconComponents = useMemo(() => ({
    success: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
  }), []);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose(id);
    }, 300);
  }, [id, onClose]);

  // Auto-dismiss timer with progress bar
  useEffect(() => {
    if (!persist && duration > 0) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (duration / 100));
          return newProgress <= 0 ? 0 : newProgress;
        });
      }, 100);

      const timer = setTimeout(handleClose, duration);

      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
  }, [duration, persist, handleClose]);

  const toastClasses = useMemo(() => {
    const baseClasses = 'flex items-start p-4 mb-2 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform relative overflow-hidden min-w-80 max-w-sm';
    const typeClass = typeStyles[type];
    const animationClasses = isExiting 
      ? 'translate-x-full opacity-0 scale-95' 
      : 'translate-x-0 opacity-100 scale-100';
    return [baseClasses, typeClass, animationClasses, className].filter(Boolean).join(' ');
  }, [typeStyles, type, isExiting, className]);

  if (!isVisible) return null;

  return (
    <div 
      className={toastClasses}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {/* Progress bar */}
      {!persist && duration > 0 && (
        <div 
          className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
          aria-hidden="true"
        />
      )}
      
      {showIcon && (
        <div className="flex-shrink-0 mr-3 mt-0.5">
          {iconComponents[type]}
        </div>
      )}
      
      <div className="flex-1 min-w-0 mr-3">
        <p className="text-sm font-medium break-words">{message}</p>
      </div>
      
      <button
        onClick={handleClose}
        className="flex-shrink-0 ml-auto bg-transparent border-0 text-current hover:opacity-75 focus:opacity-75 focus:outline-none focus:ring-2 focus:ring-white/50 rounded p-1 transition-opacity"
        aria-label={`通知を閉じる: ${message}`}
        type="button"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
});

Toast.displayName = 'Toast';

export default Toast;
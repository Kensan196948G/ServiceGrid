import * as React from 'react';
const { useState, useEffect, memo, useCallback, useMemo, forwardRef, useId } = React;
type ReactNode = React.ReactNode;
import { 
  Home, FileText, Settings, Users, AlertTriangle, Package, 
  BarChart3, Shield, CheckSquare, Clock, GitMerge, BookOpen,
  TrendingUp, Server, Lock, FileCheck, Menu, X, Search,
  Plus, Trash2, Edit, Eye, Filter, RefreshCw, Download,
  Upload, Bell, LogOut, User
} from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = memo(forwardRef<HTMLButtonElement, ButtonProps>((
  { children, variant = 'primary', size = 'md', className, isLoading, disabled, leftIcon, rightIcon, fullWidth, ...props },
  ref
) => {
  const baseStyles = useMemo(() => 
    'font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition ease-in-out duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2',
    []
  );
  
  const variantStyles = useMemo(() => ({
    primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white focus:ring-blue-500',
    secondary: 'bg-slate-600 hover:bg-slate-700 active:bg-slate-800 text-white focus:ring-slate-500',
    success: 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white focus:ring-green-500',
    danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white focus:ring-red-500',
    ghost: 'bg-transparent hover:bg-slate-200 active:bg-slate-300 text-slate-700 focus:ring-slate-500 border border-slate-300',
  }), []);
  
  const sizeStyles = useMemo(() => ({
    sm: 'px-3 py-1.5 text-sm min-h-8',
    md: 'px-4 py-2 text-base min-h-10',
    lg: 'px-6 py-3 text-lg min-h-12',
  }), []);

  const buttonClasses = useMemo(() => {
    const classes = [baseStyles, variantStyles[variant], sizeStyles[size]];
    if (fullWidth) classes.push('w-full');
    if (className) classes.push(className);
    return classes.join(' ');
  }, [baseStyles, variantStyles, variant, sizeStyles, size, fullWidth, className]);

  return (
    <button
      ref={ref}
      className={buttonClasses}
      disabled={disabled || isLoading}
      aria-disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Spinner size="sm" aria-label="読み込み中" />
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
}));

Button.displayName = 'Button';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = memo(forwardRef<HTMLInputElement, InputProps>((
  { label, id: providedId, error, className, required, helperText, leftIcon, rightIcon, ...props },
  ref
) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const helperTextId = `${id}-helper`;

  const inputClasses = useMemo(() => {
    const baseClasses = 'block w-full border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors';
    const paddingClasses = leftIcon && rightIcon ? 'pl-10 pr-10 py-2' : leftIcon ? 'pl-10 pr-3 py-2' : rightIcon ? 'pl-3 pr-10 py-2' : 'px-3 py-2';
    const errorClasses = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '';
    return [baseClasses, paddingClasses, errorClasses, className].filter(Boolean).join(' ');
  }, [leftIcon, rightIcon, error, className]);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="必須">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={id}
          className={inputClasses}
          required={required}
          aria-invalid={!!error}
          aria-describedby={`${error ? errorId : ''} ${helperText ? helperTextId : ''}`.trim() || undefined}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            {rightIcon}
          </div>
        )}
      </div>
      {helperText && !error && (
        <p id={helperTextId} className="mt-1 text-xs text-slate-500">{helperText}</p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  );
}));

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  resize?: 'none' | 'both' | 'horizontal' | 'vertical';
}

export const Textarea = memo(forwardRef<HTMLTextAreaElement, TextareaProps>((
  { label, id: providedId, error, className, required, helperText, resize = 'vertical', ...props },
  ref
) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const helperTextId = `${id}-helper`;

  const textareaClasses = useMemo(() => {
    const baseClasses = 'block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors';
    const errorClasses = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '';
    const resizeClasses = `resize-${resize}`;
    return [baseClasses, errorClasses, resizeClasses, className].filter(Boolean).join(' ');
  }, [error, resize, className]);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="必須">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        rows={4}
        className={textareaClasses}
        required={required}
        aria-invalid={!!error}
        aria-describedby={`${error ? errorId : ''} ${helperText ? helperTextId : ''}`.trim() || undefined}
        {...props}
      />
      {helperText && !error && (
        <p id={helperTextId} className="mt-1 text-xs text-slate-500">{helperText}</p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  );
}));

Textarea.displayName = 'Textarea';


interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string | number; label: string; disabled?: boolean }[];
  placeholder?: string;
}

export const Select = memo(forwardRef<HTMLSelectElement, SelectProps>((
  { label, id: providedId, error, options, placeholder, className, required, helperText, ...props },
  ref
) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const helperTextId = `${id}-helper`;

  const selectClasses = useMemo(() => {
    const baseClasses = 'block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors hover:border-slate-400';
    const errorClasses = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '';
    return [baseClasses, errorClasses, className].filter(Boolean).join(' ');
  }, [error, className]);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="必須">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={selectClasses}
        required={required}
        aria-invalid={!!error}
        aria-describedby={`${error ? errorId : ''} ${helperText ? helperTextId : ''}`.trim() || undefined}
        {...props}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText && !error && (
        <p id={helperTextId} className="mt-1 text-xs text-slate-500">{helperText}</p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  );
}));

Select.displayName = 'Select';


interface CardProps {
  children: ReactNode;
  title?: string;
  className?: string;
  actions?: ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  as?: 'div' | 'article' | 'section';
}

export const Card = memo<CardProps>(({ 
  children, 
  title, 
  className, 
  actions, 
  variant = 'default',
  padding = 'md',
  as: Component = 'div'
}) => {
  const variantClasses = useMemo(() => ({
    default: 'bg-white shadow-lg',
    outlined: 'bg-white border border-slate-200',
    elevated: 'bg-white shadow-xl',
  }), []);

  const paddingClasses = useMemo(() => ({
    none: '',
    sm: 'p-3',
    md: 'p-4 md:p-6',
    lg: 'p-6 md:p-8',
  }), []);

  const cardClasses = useMemo(() => {
    const classes = [variantClasses[variant], 'rounded-lg overflow-hidden'];
    if (className) classes.push(className);
    return classes.join(' ');
  }, [variantClasses, variant, className]);

  return (
    <Component className={cardClasses}>
      {title && (
        <div className="p-4 border-b border-slate-200 flex justify-between items-start gap-4">
          <h3 className="text-lg font-semibold text-slate-800 min-w-0 flex-1">{title}</h3>
          {actions && (
            <div className="flex-shrink-0" role="group" aria-label="カードアクション">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className={paddingClasses[padding]}>
        {children}
      </div>
    </Component>
  );
});

Card.displayName = 'Card';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  closeOnOverlayClick?: boolean;
  closeOnEscapeKey?: boolean;
  showCloseButton?: boolean;
  footer?: ReactNode;
}

export const Modal = memo<ModalProps>(({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscapeKey = true,
  showCloseButton = true,
  footer
}) => {
  const titleId = useId();

  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && closeOnEscapeKey) {
      onClose();
    }
  }, [closeOnEscapeKey, onClose]);

  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  useEffect(() => {
    if (isOpen && closeOnEscapeKey) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => document.removeEventListener('keydown', handleEscapeKey);
    }
  }, [isOpen, closeOnEscapeKey, handleEscapeKey]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  const sizeClasses = useMemo(() => ({
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
  }), []);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900 bg-opacity-75 transition-opacity" 
      aria-labelledby={titleId}
      role="dialog" 
      aria-modal="true"
      onClick={handleOverlayClick}
    >
      <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div 
          className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full ${sizeClasses[size]}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-slate-900 flex-1" id={titleId}>
                {title}
              </h3>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="ml-4 text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1"
                  aria-label="モーダルを閉じる"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <div>{children}</div>
          </div>
          {footer && (
            <div className="bg-slate-50 px-4 py-3 sm:px-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              {footer}
            </div>
          )}
          {!footer && (
            <div className="bg-slate-50 px-4 py-3 sm:px-6 flex flex-col-reverse sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={onClose}>
                閉じる
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

Modal.displayName = 'Modal';

interface TableColumn<T> {
  Header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  width?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  striped?: boolean;
  compact?: boolean;
  sticky?: boolean;
}

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState = memo<EmptyStateProps>(({ 
  title = "データがありません", 
  description = "現在表示できるデータがありません。",
  action 
}) => {
  return (
    <div className="text-center py-8" role="status">
      <div className="text-slate-400 text-6xl mb-4" aria-hidden="true">📋</div>
      <h3 className="text-lg font-medium text-slate-700 mb-2">{title}</h3>
      <p className="text-slate-500 mb-4">{description}</p>
      {action && (
        <div className="mt-4" role="group" aria-label="利用可能なアクション">
          {action}
        </div>
      )}
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

export const Table = memo(<T extends { id: string | number }>({ 
  columns, 
  data, 
  onRowClick, 
  loading = false, 
  emptyMessage = 'データがありません',
  striped = true,
  compact = false,
  sticky = false
}: TableProps<T>): ReactNode => {
  const tableClasses = useMemo(() => {
    const classes = ['min-w-full divide-y divide-slate-200'];
    if (compact) classes.push('text-sm');
    return classes.join(' ');
  }, [compact]);

  const theadClasses = useMemo(() => {
    const classes = ['bg-slate-50'];
    if (sticky) classes.push('sticky top-0 z-10');
    return classes.join(' ');
  }, [sticky]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="データ読み込み中">
        <Spinner size="lg" aria-hidden="true" />
        <span className="ml-3 text-slate-600">読み込み中...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12" role="status">
        <div className="text-slate-400 text-lg mb-2" aria-hidden="true">📊</div>
        <p className="text-slate-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
      <table className={tableClasses} role="table">
        <thead className={theadClasses}>
          <tr>
            {columns.map((column, index) => {
              const alignClass = column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left';
              return (
                <th 
                  key={index} 
                  scope="col" 
                  className={`px-6 py-3 ${alignClass} text-xs font-medium text-slate-500 uppercase tracking-wider`}
                  style={{ width: column.width }}
                >
                  {column.Header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {data.map((row, rowIndex) => {
            const rowClasses = [
              onRowClick ? 'hover:bg-blue-50 cursor-pointer transition-colors duration-150 focus-within:bg-blue-50' : '',
              striped && rowIndex % 2 === 1 ? 'bg-slate-25' : 'bg-white'
            ].filter(Boolean).join(' ');

            return (
              <tr 
                key={row.id} 
                onClick={() => onRowClick?.(row)}
                className={rowClasses}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onRowClick(row);
                  }
                }}
              >
                {columns.map((column, colIndex) => {
                  const alignClass = column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left';
                  const paddingClass = compact ? 'px-4 py-2' : 'px-6 py-4';
                  return (
                    <td key={colIndex} className={`${paddingClass} whitespace-nowrap text-sm text-slate-700 ${alignClass}`}>
                      {typeof column.accessor === 'function' 
                        ? column.accessor(row) 
                        : String(row[column.accessor] ?? '')}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}) as <T extends { id: string | number }>(props: TableProps<T>) => ReactNode;

Table.displayName = 'Table';


interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: string;
  thickness?: 'thin' | 'normal' | 'thick';
}

export const Spinner = memo<SpinnerProps>(({ 
  size = 'md', 
  className = '', 
  color = 'text-blue-600',
  thickness = 'normal'
}) => {
  const sizeClasses = useMemo(() => ({
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }), []);

  const thicknessClasses = useMemo(() => ({
    thin: 'border-t border-b',
    normal: 'border-t-2 border-b-2',
    thick: 'border-t-4 border-b-4',
  }), []);

  const spinnerClasses = useMemo(() => {
    const classes = [
      'animate-spin rounded-full border-transparent',
      sizeClasses[size],
      thicknessClasses[thickness],
      color,
      className
    ];
    return classes.filter(Boolean).join(' ');
  }, [sizeClasses, size, thicknessClasses, thickness, color, className]);

  return (
    <div className={spinnerClasses} role="status" aria-label="読み込み中">
      <span className="sr-only">読み込み中...</span>
    </div>
  );
});

Spinner.displayName = 'Spinner';


export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
  WARNING = 'warning',
}

interface NotificationProps {
  message: string;
  type: NotificationType;
  onClose?: () => void;
  duration?: number; // ms
}

export const Notification = memo<NotificationProps>(({ message, type, onClose, duration = 5000 }) => {
  const [visible, setVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(handleClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, handleClose]);

  const typeStyles = useMemo(() => ({
    [NotificationType.SUCCESS]: 'bg-green-500 text-white border-l-4 border-green-700',
    [NotificationType.ERROR]: 'bg-red-500 text-white border-l-4 border-red-700',
    [NotificationType.INFO]: 'bg-blue-500 text-white border-l-4 border-blue-700',
    [NotificationType.WARNING]: 'bg-yellow-500 text-black border-l-4 border-yellow-700',
  }), []);

  const iconMap = useMemo(() => ({
    [NotificationType.SUCCESS]: '✓',
    [NotificationType.ERROR]: '✗',
    [NotificationType.INFO]: 'ℹ',
    [NotificationType.WARNING]: '⚠',
  }), []);

  const notificationClasses = useMemo(() => {
    const baseStyles = 'p-4 rounded-md shadow-lg text-sm font-medium fixed top-5 right-5 z-[100] transform transition-all duration-300 max-w-sm';
    const animationClasses = isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100';
    return `${baseStyles} ${typeStyles[type]} ${animationClasses}`;
  }, [typeStyles, type, isExiting]);

  if (!visible) return null;

  return (
    <div 
      className={notificationClasses} 
      role="alert" 
      aria-live={type === NotificationType.ERROR ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <span className="flex-shrink-0 font-bold text-lg" aria-hidden="true">
            {iconMap[type]}
          </span>
          <span className="break-words">{message}</span>
        </div>
        {onClose && (
          <button 
            onClick={handleClose} 
            className="flex-shrink-0 text-lg leading-none hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-white rounded p-1"
            aria-label="通知を閉じる"
            type="button"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
});

Notification.displayName = 'Notification';
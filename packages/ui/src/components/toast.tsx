import { cn } from '../utils';

export interface ToastProps {
  id: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  onDismiss?: (id: string) => void;
}

export function Toast({ id, type = 'info', title, message, onDismiss }: ToastProps) {
  const borderVariants = {
    success: 'border-l-4 border-l-emerald-500',
    error: 'border-l-4 border-l-rose-500',
    warning: 'border-l-4 border-l-amber-500',
    info: 'border-l-4 border-l-indigo-500',
  };

  return (
    <div
      className={cn(
        'flex w-full max-w-sm items-start justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900',
        borderVariants[type]
      )}
      role="alert"
    >
      <div className="flex-1 pr-2">
        <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">{title}</h4>
        {message && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{message}</p>}
      </div>

      {onDismiss && (
        <button
          onClick={() => onDismiss(id)}
          className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Dismiss toast"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

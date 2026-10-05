import React from 'react';
import { useTheme } from './theme-provider';
import { Sun, Moon } from 'lucide-react';
import { cn } from '../utils';

export interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function ThemeToggle({ className, ...props }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'inline-flex items-center justify-center p-2 rounded-lg text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600',
        className
      )}
      aria-label="Toggle color theme"
      title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      {...props}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}


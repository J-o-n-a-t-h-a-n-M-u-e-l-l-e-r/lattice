'use client';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

const MODES = [
  { id: 'light', icon: Sun, label: 'Light' },
  { id: 'dark', icon: Moon, label: 'Dark' },
  { id: 'system', icon: Monitor, label: 'System' },
] as const;

/** Segmented control rather than a cycling button: the current mode is visible. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex items-center gap-0.5 rounded-lg border bg-card p-0.5" role="group"
         aria-label="Colour theme">
      {MODES.map(({ id, icon: Icon, label }) => {
        const active = mounted && theme === id;
        return (
          <button key={id} type="button" onClick={() => setTheme(id)} title={label}
                  aria-label={label} aria-pressed={active}
                  className={cn(
                    'flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}>
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

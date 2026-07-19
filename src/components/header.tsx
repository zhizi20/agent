'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M12 2C6.48 2 2 6 2 10.5c0 2.5 1.5 4.8 3.8 6.2L4 22l4.5-2.3c1.1.3 2.3.5 3.5.5 5.52 0 10-4 10-8.5S17.52 2 12 2z" />
              <circle cx="8" cy="10.5" r="1" fill="currentColor" />
              <circle cx="12" cy="10.5" r="1" fill="currentColor" />
              <circle cx="16" cy="10.5" r="1" fill="currentColor" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            心声助手
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              pathname === '/'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            心声墙
          </Link>
          <Link
            href="/dashboard"
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              pathname === '/dashboard'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            数据看板
          </Link>
        </nav>
      </div>
    </header>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, BarChart3 } from 'lucide-react';

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-coral-400 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900">员工心声助手</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              pathname === '/'
                ? 'bg-amber-100 text-amber-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              互动端
            </span>
          </Link>
          <Link
            href="/dashboard"
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              pathname === '/dashboard'
                ? 'bg-amber-100 text-amber-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" />
              数据看板
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

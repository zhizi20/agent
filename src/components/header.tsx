'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useRole } from '@/contexts/role-context';
import { RoleVerificationDialog } from './role-verification-dialog';

export function Header() {
  const pathname = usePathname();
  const { hasDashboardAccess, isVerified, role } = useRole();
  const [showRoleDialog, setShowRoleDialog] = useState(false);

  const handleDashboardClick = (e: React.MouseEvent) => {
    if (!isVerified) {
      e.preventDefault();
      setShowRoleDialog(true);
    } else if (!hasDashboardAccess) {
      e.preventDefault();
      // Show rejection message for employees
      alert('您好，数据看板为管理层专属权限，仅管理人员可查看全量心声统计与分析内容，您可以使用员工心声墙提交、浏览公开心声。');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-sm">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary-foreground"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">员工心声助手</h1>
              <p className="text-[10px] text-muted-foreground">让每个声音都被听见</p>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === '/'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              心声墙
            </Link>
            <Link
              href="/dashboard"
              onClick={handleDashboardClick}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === '/dashboard'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              数据看板
            </Link>
            {isVerified && (
              <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                {role === 'admin' ? '管理员' : '员工'}
              </span>
            )}
          </nav>
        </div>
      </header>

      <RoleVerificationDialog
        isOpen={showRoleDialog}
        onClose={() => setShowRoleDialog(false)}
        onVerified={() => {
          // Navigate to dashboard after verification
          window.location.href = '/dashboard';
        }}
      />
    </>
  );
}

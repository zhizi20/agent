'use client';

import { useState } from 'react';
import { useRole } from '@/contexts/role-context';

interface RoleVerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
}

export function RoleVerificationDialog({ isOpen, onClose, onVerified }: RoleVerificationDialogProps) {
  const { setRole } = useRole();
  const [selectedRole, setSelectedRole] = useState<'employee' | 'admin' | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedRole) {
      setRole(selectedRole);
      if (selectedRole === 'admin') {
        onVerified();
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground">身份验证</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            数据看板为管理层专属权限，请选择您的身份
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setSelectedRole('employee')}
            className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
              selectedRole === 'employee'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-secondary/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                selectedRole === 'employee' ? 'bg-primary/10' : 'bg-secondary'
              }`}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={selectedRole === 'employee' ? 'text-primary' : 'text-muted-foreground'}
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-foreground">普通员工</p>
                <p className="text-xs text-muted-foreground">可访问心声墙功能</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedRole('admin')}
            className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
              selectedRole === 'admin'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-secondary/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                selectedRole === 'admin' ? 'bg-primary/10' : 'bg-secondary'
              }`}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={selectedRole === 'admin' ? 'text-primary' : 'text-muted-foreground'}
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-foreground">管理层 / 管理员</p>
                <p className="text-xs text-muted-foreground">可访问心声墙 + 数据看板</p>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedRole}
            className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}

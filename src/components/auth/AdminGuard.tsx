'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-8 text-slate-400 text-xs">
        Verifying administrator permissions...
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Administrator Access Required
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
          This administrative section is restricted to System Administrators. Redirecting to dashboard...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

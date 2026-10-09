'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import OperatorLoginPage from '@/app/login/page';

export default function RootGateway() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Initializing Gate Keeper...
          </p>
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return <OperatorLoginPage />;
}

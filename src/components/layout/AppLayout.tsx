'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import CheckInModal from '../modals/CheckInModal';
import CheckOutModal from '../modals/CheckOutModal';
import CheckStatusModal from '../modals/CheckStatusModal';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function AppLayout({
  children,
  onRefreshData,
}: {
  children: React.ReactNode;
  onRefreshData?: () => void;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInCategory, setCheckInCategory] = useState('VISITOR');
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [isCheckStatusOpen, setIsCheckStatusOpen] = useState(false);

  // Auth redirection
  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090d16]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase">
            Loading Gate Keeper...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleOpenCheckIn = (category: string = 'VISITOR') => {
    setCheckInCategory(category);
    setIsCheckInOpen(true);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-200">
        <Header
          onOpenCheckIn={handleOpenCheckIn}
          onOpenCheckOut={() => setIsCheckOutOpen(true)}
          onOpenCheckStatus={() => setIsCheckStatusOpen(true)}
        />

        <main className="flex-1 p-3 sm:p-4 md:p-5 lg:p-6 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>

      {/* Global Modals */}
      <CheckInModal
        isOpen={isCheckInOpen}
        defaultCategory={checkInCategory}
        onClose={() => setIsCheckInOpen(false)}
        onSuccess={() => {
          if (onRefreshData) onRefreshData();
        }}
      />

      <CheckOutModal
        isOpen={isCheckOutOpen}
        onClose={() => setIsCheckOutOpen(false)}
        onSuccess={() => {
          if (onRefreshData) onRefreshData();
        }}
      />

      <CheckStatusModal
        isOpen={isCheckStatusOpen}
        onClose={() => setIsCheckStatusOpen(false)}
      />
    </div>
  );
}

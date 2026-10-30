'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import ParcelManagementView, { ParcelTabType } from '@/components/parcels/ParcelManagementView';

function ParcelsPageContent() {
  const searchParams = useSearchParams();
  const rawTab = (searchParams.get('tab') || 'expected').toLowerCase();
  const action = searchParams.get('action');

  const validTab: ParcelTabType =
    rawTab === 'received' || rawTab === 'delivered' || rawTab === 'history'
      ? rawTab
      : 'expected';

  return (
    <ParcelManagementView
      initialTab={validTab}
      openRegisterInitially={action === 'register'}
    />
  );
}

export default function ParcelsPage() {
  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <Suspense fallback={<div className="p-8 text-xs text-slate-400">Loading Parcel Management...</div>}>
          <ParcelsPageContent />
        </Suspense>
      </div>
    </AppLayout>
  );
}

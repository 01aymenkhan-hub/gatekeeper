'use client';

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import VipGuestManagementView from '@/components/vip/VipGuestManagementView';

export default function VipGuestsPage() {
  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <VipGuestManagementView />
      </div>
    </AppLayout>
  );
}

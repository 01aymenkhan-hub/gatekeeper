'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import OperatorLoginPage from '@/app/login/page';
import GatekeeperLoader from '@/components/ui/GatekeeperLoader';
import { useLanguage } from '@/context/LanguageContext';

export default function RootGateway() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <GatekeeperLoader
        variant="fullscreen"
        title={t('loading_gatekeeper', 'Loading GateShield...')}
      />
    );
  }

  if (user) {
    return null;
  }

  return <OperatorLoginPage />;
}

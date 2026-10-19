'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, QrCode, Camera, AlertCircle, ArrowRight, Languages } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import OperatorQrScanner from '@/components/scanner/OperatorQrScanner';

export default function OperatorLoginPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user, loading, refreshUser, theme, toggleTheme } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  const formatErrorMessage = (rawErr: string) => {
    if (language !== 'ur') return rawErr;
    const lower = rawErr.toLowerCase();
    if (lower.includes('deactivated') || lower.includes('inactive')) {
      return 'یہ آپریٹر کارڈ بند کر دیا گیا ہے۔ براہ کرم ایڈمن سے رابطہ کریں۔';
    }
    if (lower.includes('invalid') || lower.includes('expired') || lower.includes('not found')) {
      return 'یہ کیو آر کارڈ درست نہیں ہے۔ براہ کرم اپنا اصل آپریٹر کارڈ اسکین کریں۔';
    }
    return t('auth_failed_default', 'Login verification failed. Please scan your card again.');
  };

  const handleScan = async (rawDecodedText: string) => {
    setIsVerifying(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/qr-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawDecodedText }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t('auth_failed_default'));
      }

      await refreshUser();
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('[Operator QR Login Error]:', err);
      const msg =
        err instanceof Error
          ? err.message
          : t('auth_failed_default', 'Login verification failed. Please scan your card again.');
      setError( msg );
      setIsScanning(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleStartScanning = () => {
    setError(null);
    setIsScanning(true);
  };

  const handleCancelScanning = () => {
    setIsScanning(false);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between items-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased relative overflow-hidden transition-colors">
      {/* Top Bar with Brand, Language Selector & Theme Toggle */}
      <div className="w-full max-w-md flex items-center justify-between z-20 pt-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-blue-600 text-white shadow-xs">
            <Shield className="w-4 h-4" />
          </div>
          <span className="text-xs font-black tracking-wider uppercase text-slate-700 dark:text-slate-300">
            {t('app_title', 'Gate Keeper')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* English / Urdu Language Selector */}
          <button
            onClick={toggleLanguage}
            type="button"
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
            title={language === 'ur' ? 'Switch to English' : 'اردو میں دیکھیں'}
            aria-label="Switch Language"
          >
            <Languages className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="font-semibold">{language === 'ur' ? 'English' : 'اردو'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            type="button"
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
            title={t('switch_theme', 'Switch Theme')}
          >
            {theme === 'dark' ? (
              <span className="text-amber-400">☀ {t('theme_light', 'Light')}</span>
            ) : (
              <span className="text-indigo-600">🌙 {t('theme_dark', 'Dark')}</span>
            )}
          </button>
        </div>
      </div>

      {/* Background Soft Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Content Area */}
      <div className="w-full max-w-sm sm:max-w-md my-auto relative z-10 space-y-6">
        {/* Brand Title Area (Centered in both Urdu and English) */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-snug">
            {t('operator_login_title', 'Operator Login')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
            {t(
              'operator_login_subtitle',
              'Scan your physical Operator Access Card to open your checkpoint dashboard'
            )}
          </p>
        </div>

        {/* Error Alert Banner (Left-aligned in English, Right-aligned in Urdu) */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/80 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-start gap-3 shadow-xs animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div className={`flex-1 ${language === 'ur' ? 'text-right' : 'text-left'}`}>
              <p className="font-bold">{t('auth_failed_title', 'Authentication Failed')}</p>
              <p className="text-[11px] font-normal text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">
                {formatErrorMessage(error)}
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Action Area: Scanner or Large Visual Tap Target */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-xl">
          {isScanning ? (
            <OperatorQrScanner
              onScan={handleScan}
              onCancel={handleCancelScanning}
              isVerifying={isVerifying}
            />
          ) : (
            <button
              type="button"
              onClick={handleStartScanning}
              className="w-full group flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl border-2 border-dashed border-blue-400/60 dark:border-blue-500/40 hover:border-blue-600 dark:hover:border-blue-400 bg-gradient-to-b from-blue-50/60 to-white dark:from-slate-850 dark:to-slate-900 hover:from-blue-100/50 dark:hover:from-slate-800 transition-all cursor-pointer text-center space-y-4 shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              {/* Extra prominent icon composition */}
              <div className="relative">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-blue-600 group-hover:bg-blue-700 text-white flex items-center justify-center shadow-xl shadow-blue-600/30 transition-all duration-300 group-hover:scale-105">
                  <QrCode className="w-12 h-12 sm:w-14 sm:h-14 stroke-[2.2]" />
                </div>
                {/* Floating camera badge indicator */}
                <div className="absolute -bottom-1.5 -right-1.5 p-2 rounded-xl bg-amber-500 text-white shadow-md border-2 border-white dark:border-slate-900 group-hover:rotate-6 transition-transform">
                  <Camera className="w-4 h-4" />
                </div>
              </div>

              {/* Action Labels */}
              <div className="space-y-1.5 text-center">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                  {t('scan_your_qr_code', 'Scan Your QR Code')}
                </h2>
                <div className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">
                  <span>{t('tap_to_open_camera', 'Tap anywhere to open camera')}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform shrink-0" />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 w-full text-center">
                <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium">
                  {t('instant_mobile_login', 'Instant mobile login • No password required')}
                </p>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-md text-center py-2 z-10">
        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          {t('login_footer', 'Gate Keeper v2.0 • Checkpoint Access Control')}
        </p>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, QrCode, Camera, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import OperatorQrScanner from '@/components/scanner/OperatorQrScanner';

export default function OperatorLoginPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user, loading, refreshUser, theme, toggleTheme } = useAuth();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

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
        throw new Error(data.error || 'Failed to authenticate operator QR code.');
      }

      await refreshUser();
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('[Operator QR Login Error]:', err);
      const msg = err instanceof Error ? err.message : 'Login verification failed. Please scan your card again.';
      setError(msg);
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
      {/* Top Bar with Theme Toggle */}
      <div className="w-full max-w-md flex items-center justify-between z-20 pt-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-blue-600 text-white shadow-xs">
            <Shield className="w-4 h-4" />
          </div>
          <span className="text-xs font-black tracking-wider uppercase text-slate-700 dark:text-slate-300">
            Gate Keeper
          </span>
        </div>

        <button
          onClick={toggleTheme}
          type="button"
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? (
            <span className="text-amber-400">☀ Light</span>
          ) : (
            <span className="text-indigo-600">🌙 Dark</span>
          )}
        </button>
      </div>

      {/* Background Soft Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Content Area */}
      <div className="w-full max-w-sm sm:max-w-md my-auto relative z-10 space-y-6">
        
        {/* Brand Title Area */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Operator Login
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            Scan your physical Operator Access Card to open your checkpoint dashboard
          </p>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/80 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-start gap-3 shadow-xs animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Authentication Failed</p>
              <p className="text-[11px] font-normal text-rose-700 dark:text-rose-300 mt-0.5">{error}</p>
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
              <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Scan Your QR Code
                </h2>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                  <span>Tap anywhere to open camera</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 w-full text-center">
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  Instant mobile login • No password required
                </p>
              </div>
            </button>
          )}
        </div>

        {/* Discreet Admin Login Link */}
        <div className="text-center pt-1">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <span>System Administrator? Sign in with email</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-md text-center py-2 z-10">
        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          Gate Keeper v2.0 • Checkpoint Access Control
        </p>
      </div>
    </div>
  );
}

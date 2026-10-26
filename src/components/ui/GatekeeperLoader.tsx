'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface GatekeeperLoaderProps {
  /** Primary localized status message */
  message?: string;
  /** Alias for primary localized status message */
  title?: string;
  /** Optional secondary subtitle message */
  subMessage?: string;
  /** Alias for secondary subtitle message */
  subtitle?: string;
  /** Display mode: 'fullscreen' (initial app load), 'section' (page/dashboard load), 'card' (OCR/modal step), or 'inline' (compact spinner) */
  variant?: 'fullscreen' | 'section' | 'card' | 'inline';
  /** Show a subtle reassurance hint if an operation takes longer than expected */
  showSlowNetworkHint?: boolean;
  /** Threshold in ms before showing the slow network hint (default 5000ms) */
  slowThresholdMs?: number;
}

export default function GatekeeperLoader({
  message,
  title,
  subMessage,
  subtitle,
  variant = 'section',
  showSlowNetworkHint = true,
  slowThresholdMs = 5000,
}: GatekeeperLoaderProps) {
  const { t } = useLanguage();
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!showSlowNetworkHint) return;
    const timer = setTimeout(() => {
      setIsSlow(true);
    }, slowThresholdMs);
    return () => clearTimeout(timer);
  }, [showSlowNetworkHint, slowThresholdMs]);

  const resolvedMessage = title || message || t('loading_gatekeeper', 'Loading Gate Keeper...');
  const resolvedSubtitle = subtitle || subMessage;
  const slowHintText = t(
    'slow_operation_hint',
    'Still working, please wait a moment...'
  );

  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold">
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        <span>{resolvedMessage}</span>
      </span>
    );
  }

  const brandEmblem = (
    <div className="relative flex items-center justify-center">
      {/* Subtle outer spinning ring */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-blue-200 dark:border-blue-900/70 flex items-center justify-center">
        <div className="absolute inset-0 rounded-2xl border-2 border-blue-600 dark:border-blue-400 border-t-transparent animate-spin" />
        {/* Existing Gatekeeper Shield Logo Emblem */}
        <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
          <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
        </div>
      </div>
    </div>
  );

  if (variant === 'fullscreen') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors">
        <div className="flex flex-col items-center text-center max-w-xs space-y-4">
          {brandEmblem}
          <div className="space-y-1">
            <span className="text-[11px] font-black tracking-widest uppercase text-blue-600 dark:text-blue-400 block">
              {t('app_title', 'Gate Keeper')}
            </span>
            <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              {resolvedMessage}
            </p>
            {resolvedSubtitle && (
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {resolvedSubtitle}
              </p>
            )}
            {isSlow && (
              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 pt-1 animate-in fade-in duration-200">
                {slowHintText}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/30 p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-3.5 animate-in fade-in duration-150">
        {brandEmblem}
        <div className="space-y-1 max-w-sm">
          <span className="text-[10px] font-black tracking-widest uppercase text-blue-600 dark:text-blue-400 block">
            {t('app_title', 'Gate Keeper')}
          </span>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
            {resolvedMessage}
          </h3>
          {resolvedSubtitle && (
            <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
              {resolvedSubtitle}
            </p>
          )}
          {isSlow && (
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 pt-1 animate-in fade-in duration-200">
              {slowHintText}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Default: 'section'
  return (
    <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-3.5">
      {brandEmblem}
      <div className="space-y-1 max-w-xs">
        <span className="text-[10px] font-black tracking-widest uppercase text-blue-600 dark:text-blue-400 block">
          {t('app_title', 'Gate Keeper')}
        </span>
        <p className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200">
          {resolvedMessage}
        </p>
        {resolvedSubtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {resolvedSubtitle}
          </p>
        )}
        {isSlow && (
          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 pt-1 animate-in fade-in duration-200">
            {slowHintText}
          </p>
        )}
      </div>
    </div>
  );
}

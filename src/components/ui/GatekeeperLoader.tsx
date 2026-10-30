'use client';

import React, { useEffect, useId, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';

export interface GatekeeperLoaderProps {
  title?: string;
  subtitle?: string;
  /**
   * 'fullscreen' covers the entire viewport (e.g. initial auth/session check).
   * 'section' renders centered inside a dashboard/table/modal container.
   * 'overlay' / 'card' covers a relative parent card/modal during active processing (e.g. OCR scan).
   * 'compact' renders an inline branded loader bar.
   */
  variant?: 'fullscreen' | 'section' | 'overlay' | 'card' | 'compact';
  /**
   * If the operation runs longer than this threshold (ms), display a subtle reassurance message.
   * Defaults to 4500ms.
   */
  showSlowHintAfterMs?: number;
}

interface GateShieldAnimatedMarkProps {
  isDark: boolean;
  sizeClassName: string;
}

/**
 * Renders the official GateShield hexagonal building-gate mark with:
 * 1. The outer hexagonal building outline, lintel, and door jambs completely stationary (official PNG).
 * 2. A flowing, thin GateShield blue perimeter scan with a soft localized halo that travels smoothly
 *    clockwise around the exact outer building outline (287.5,12 -> 526,150 -> 526,425 -> 287.5,563 -> 49,425 -> 49,150).
 * 3. The subtle inner swinging gate leaf (pivoting around its right hinge at 398,420) and access light
 *    synchronized with the perimeter scan passing the gate entrance.
 */
function GateShieldAnimatedMark({ isDark, sizeClassName }: GateShieldAnimatedMarkProps) {
  const uid = useId().replace(/:/g, '');
  const [imgError, setImgError] = useState(false);

  const iconSrc = isDark
    ? '/brand/gateshield-icon-dark.png'
    : '/brand/gateshield-icon-light.png';

  // Sampled directly from the official GateShield assets:
  // Light mode icon fill: #334c91 (RGB 51, 76, 145)
  // Dark mode icon fill:  #ffffff (RGB 255, 255, 255)
  const gateFillColor = isDark ? '#ffffff' : '#334c91';
  const edgeHighlightColor = isDark ? '#60a5fa' : '#3b82f6';
  const scanBodyColor = isDark ? '#3b82f6' : '#2563eb';
  const scanCoreColor = isDark ? '#93c5fd' : '#60a5fa';

  const clipDoorwayId = `gs-doorway-clip-${uid}`;
  const clipThresholdId = `gs-threshold-clip-${uid}`;
  const lightGradId = `gs-access-grad-${uid}`;
  const entrancePulseGradId = `gs-entrance-pulse-${uid}`;
  const scanHaloFilterId = `gs-scan-halo-${uid}`;

  // Exact measured outer hexagonal building perimeter in the 576x576 asset coordinate space
  const outerPerimeterPath =
    'M 287.5 12 L 526 150 L 526 425 L 287.5 563 L 49 425 L 49 150 Z';

  if (imgError) {
    return (
      <div
        className={`${sizeClassName} rounded-xl bg-[#334c91] text-white font-black text-sm flex items-center justify-center shrink-0`}
      >
        GS
      </div>
    );
  }

  return (
    <div className={`relative ${sizeClassName} shrink-0 select-none`}>
      {/* Stationary Official GateShield Logo (outer hexagon, doorway lintel, and vertical jambs remain 100% fixed) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={iconSrc}
        alt="GateShield"
        draggable={false}
        onError={() => setImgError(true)}
        className="w-full h-full object-contain gs-logo-stationary-base"
      />

      {/* Precision-Aligned 576x576 Perimeter Scan, Inner Gate & Entrance Light Overlay */}
      <svg
        viewBox="0 0 576 576"
        className="absolute inset-0 w-full h-full pointer-events-none gs-gate-overlay-svg overflow-visible"
        aria-hidden="true"
      >
        <defs>
          {/* Localized soft halo filter applied ONLY to the moving perimeter scan segment */}
          <filter
            id={scanHaloFilterId}
            x="-12%"
            y="-12%"
            width="124%"
            height="124%"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" />
          </filter>

          {/* Clips strictly to the inner doorway corridor between the left jamb (x=322) and right jamb (x=398) */}
          <clipPath id={clipDoorwayId}>
            <polygon points="321.2,330 398.8,330 398.8,420.5 321.2,464.2" />
          </clipPath>

          {/* Clips the subtle access light to the open entrance floor triangle */}
          <clipPath id={clipThresholdId}>
            <polygon points="322,368 398,420 322,464" />
          </clipPath>

          {/* Subtle GateShield blue access light gradient */}
          <linearGradient id={lightGradId} x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="45%" stopColor={isDark ? '#60a5fa' : '#2563eb'} stopOpacity={isDark ? '0.45' : '0.32'} />
            <stop offset="75%" stopColor={isDark ? '#93c5fd' : '#3b82f6'} stopOpacity={isDark ? '0.65' : '0.48'} />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </linearGradient>

          {/* Restrained brightness pulse near the gate entrance when the perimeter scan reaches the doorway */}
          <radialGradient id={entrancePulseGradId} cx="356" cy="426" r="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={isDark ? '#60a5fa' : '#3b82f6'} stopOpacity={isDark ? '0.42' : '0.32'} />
            <stop offset="65%" stopColor="#3b82f6" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Synchronized Subtle Entrance Pulse when the perimeter scan reaches the gate */}
        <circle
          cx="356"
          cy="426"
          r="54"
          fill={`url(#${entrancePulseGradId})`}
          className="gs-entrance-glow"
        />

        {/* 2. Subtle Access Light travelling inward through the open gate threshold */}
        <g clipPath={`url(#${clipThresholdId})`}>
          <g className="gs-access-light">
            <polygon
              points="310,362 412,414 338,476 296,430"
              fill={`url(#${lightGradId})`}
            />
          </g>
        </g>

        {/* 3. Inner Gate Leaf pivoting gently open around the right hinge (398, 420) and returning smoothly */}
        <g clipPath={`url(#${clipDoorwayId})`}>
          <g className="gs-gate-leaf">
            {/* Solid gate leaf matching exact official PNG color (#334c91 light / #ffffff dark) */}
            <polygon
              points="318,324 402,324 399,420.3 321,392.2"
              fill={gateFillColor}
            />
            {/* Subtle edge highlight along the lower edge of the opening gate */}
            <line
              x1="322"
              y1="391.8"
              x2="398"
              y2="419.6"
              stroke={edgeHighlightColor}
              strokeWidth="4.5"
              strokeLinecap="round"
              className="gs-gate-edge"
            />
          </g>
        </g>

        {/* 4. Flowing Outer Perimeter Scanning Glow (tracks the exact hexagonal building outline) */}
        {/* 4a. Soft, limited halo only around the moving scan segment */}
        <path
          d={outerPerimeterPath}
          pathLength={1000}
          fill="none"
          stroke={scanBodyColor}
          strokeWidth="15"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="165 835"
          strokeOpacity={isDark ? '0.38' : '0.3'}
          filter={`url(#${scanHaloFilterId})`}
          className="gs-perimeter-scan-line"
        />
        {/* 4b. Smooth flowing scan body */}
        <path
          d={outerPerimeterPath}
          pathLength={1000}
          fill="none"
          stroke={scanBodyColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="115 885"
          strokeOpacity={isDark ? '0.78' : '0.72'}
          className="gs-perimeter-scan-line"
        />
        {/* 4c. Thin, sharp leading scan highlight */}
        <path
          d={outerPerimeterPath}
          pathLength={1000}
          fill="none"
          stroke={scanCoreColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="55 945"
          strokeOpacity="0.95"
          className="gs-perimeter-scan-line"
        />
      </svg>
    </div>
  );
}

export default function GatekeeperLoader({
  title,
  subtitle,
  variant = 'section',
  showSlowHintAfterMs = 4500,
}: GatekeeperLoaderProps) {
  const { language, t } = useLanguage();
  const { theme } = useAuth();
  const isUr = language === 'ur';
  const isDark = theme === 'dark';
  const [showSlowHint, setShowSlowHint] = useState(false);

  useEffect(() => {
    if (!showSlowHintAfterMs || showSlowHintAfterMs <= 0) return;
    const timer = setTimeout(() => {
      setShowSlowHint(true);
    }, showSlowHintAfterMs);
    return () => clearTimeout(timer);
  }, [showSlowHintAfterMs]);

  const resolvedTitle = title || t('loading_gatekeeper', 'Loading GateShield...');

  if (variant === 'compact') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 ${
          isUr ? 'text-right' : 'text-left'
        }`}
      >
        <GateShieldAnimatedMark isDark={isDark} sizeClassName="w-7 h-7" />
        <div className="min-w-0">
          <p dir="auto" className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
            {resolvedTitle}
          </p>
          {subtitle && (
            <p dir="auto" className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    );
  }

  const containerClasses =
    variant === 'fullscreen'
      ? 'min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100'
      : variant === 'overlay' || variant === 'card'
      ? 'w-full rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 shadow-sm text-center'
      : 'w-full py-14 px-6 flex flex-col items-center justify-center text-center';

  return (
    <div role="status" aria-live="polite" className={containerClasses}>
      {/* Clean, Centered GateShield Mark Container (No Heavy Blur or 3D Distortion) */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center mb-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <GateShieldAnimatedMark
          isDark={isDark}
          sizeClassName="w-16 h-16 sm:w-[72px] sm:h-[72px]"
        />
      </div>

      {/* Loading Status Text */}
      <div className="max-w-sm space-y-1 text-center">
        <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
          {resolvedTitle}
        </p>
        {subtitle && (
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
            {subtitle}
          </p>
        )}
        {showSlowHint && (
          <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 pt-1 animate-in fade-in duration-300">
            {t('slow_operation_hint', 'Still working, please wait a moment...')}
          </p>
        )}
      </div>
    </div>
  );
}


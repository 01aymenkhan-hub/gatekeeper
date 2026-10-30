'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export interface GateShieldLogoProps {
  /**
   * 'full' renders the horizontal GateShield mark + wordmark.
   * 'icon' renders the standalone hexagonal shield-door mark.
   * 'mono' renders the monochrome high-contrast black horizontal logo (ideal for print/badges).
   */
  variant?: 'full' | 'icon' | 'mono';
  /**
   * Preset sizing for common surfaces (sidebar, header, auth cards, badges).
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Optional override to force light-mode or dark-mode artwork regardless of active theme
   * (e.g., on always-dark gradient banners or always-light printable passes).
   */
  forceTheme?: 'light' | 'dark';
  className?: string;
  imgClassName?: string;
}

const FULL_SIZE_CLASSES: Record<NonNullable<GateShieldLogoProps['size']>, string> = {
  xs: 'h-6',
  sm: 'h-7 sm:h-8',
  md: 'h-8 sm:h-9',
  lg: 'h-10 sm:h-12',
  xl: 'h-12 sm:h-14',
};

const ICON_SIZE_CLASSES: Record<NonNullable<GateShieldLogoProps['size']>, string> = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-9 h-9 sm:w-10 sm:h-10',
  lg: 'w-12 h-12 sm:w-14 sm:h-14',
  xl: 'w-16 h-16 sm:w-20 sm:h-20',
};

/**
 * Reusable theme-aware GateShield brand component.
 * Automatically switches between the supplied light-mode (#2E4482 Royal Blue)
 * and dark-mode (White) GateShield assets whenever the user toggles themes.
 */
export default function GateShieldLogo({
  variant = 'full',
  size = 'md',
  forceTheme,
  className = '',
  imgClassName = '',
}: GateShieldLogoProps) {
  const { theme } = useAuth();
  const [imgError, setImgError] = useState(false);

  const effectiveTheme = forceTheme || (theme === 'dark' ? 'dark' : 'light');

  let src = '/brand/gateshield-logo-light.png';
  if (variant === 'mono') {
    src = '/brand/gateshield-logo-mono.png';
  } else if (variant === 'icon') {
    src =
      effectiveTheme === 'dark'
        ? '/brand/gateshield-icon-dark.png'
        : '/brand/gateshield-icon-light.png';
  } else {
    src =
      effectiveTheme === 'dark'
        ? '/brand/gateshield-logo-dark.png'
        : '/brand/gateshield-logo-light.png';
  }

  // Clean fallback if image asset ever fails to load
  if (imgError) {
    return (
      <span
        className={`inline-flex items-center gap-2 font-extrabold tracking-tight select-none ${
          effectiveTheme === 'dark' ? 'text-white' : 'text-[#2E4482] dark:text-white'
        } ${className}`}
      >
        <span
          className={`inline-flex items-center justify-center rounded-lg font-black ${
            effectiveTheme === 'dark'
              ? 'bg-white/15 text-white'
              : 'bg-[#2E4482] text-white'
          } w-7 h-7 text-xs`}
        >
          GS
        </span>
        {variant !== 'icon' && <span className="text-base sm:text-lg">GateShield</span>}
      </span>
    );
  }

  const sizeClass =
    variant === 'icon' ? ICON_SIZE_CLASSES[size] : FULL_SIZE_CLASSES[size];

  return (
    <span className={`inline-flex items-center shrink-0 select-none ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="GateShield"
        onError={() => setImgError(true)}
        draggable={false}
        className={`${sizeClass} w-auto object-contain transition-opacity duration-150 ${imgClassName}`}
      />
    </span>
  );
}

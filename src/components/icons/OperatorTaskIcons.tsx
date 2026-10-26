import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

/**
 * Task-specific icon: Visitor Registration / Check-In
 * Shows a security entry gate with a person silhouette and an addition (+) badge.
 */
export function IconRegisterVisitor({ className = 'w-8 h-8', size, ...props }: IconProps) {
  return (
    <svg
      width={size || 36}
      height={size || 36}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Entry Gate Arch / Threshold */}
      <path
        d="M6 31V7C6 5.34315 7.34315 4 9 4H27C28.6569 4 30 5.34315 30 7V31"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Threshold Base */}
      <path d="M3 31H33" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Visitor Silhouette inside gate */}
      <circle cx="18" cy="13" r="4.5" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <path
        d="M11.5 27C11.5 23.4101 14.4101 20.5 18 20.5C21.5899 20.5 24.5 23.4101 24.5 27"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Add / Entry Badge (Bottom Right) */}
      <circle cx="26" cy="24" r="5.5" className="fill-emerald-500 stroke-white dark:stroke-slate-900" strokeWidth="2" />
      <path d="M26 21.5V26.5M23.5 24H28.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Task-specific icon: Visitor Checkout / Exit
 * Shows a security gate with a person and an outgoing departure arrow.
 */
export function IconCheckoutVisitor({ className = 'w-8 h-8', size, ...props }: IconProps) {
  return (
    <svg
      width={size || 36}
      height={size || 36}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Exit Gate Left Post & Door */}
      <path d="M5 4V32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M5 6H19V30H5" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Doorknob */}
      <circle cx="15" cy="18" r="1.5" fill="currentColor" />
      {/* Exiting Person */}
      <circle cx="25" cy="11" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <path
        d="M21 23C21 20.2 22.8 18 25 18C27.2 18 29 20.2 29 23"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Outgoing Exit Arrow */}
      <path
        d="M19 28H32M32 28L28 24M32 28L28 32"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Task-specific icon: Check Visitor Status / Verify Pass
 * Shows a security identity badge with a verified shield checkmark.
 */
export function IconCheckStatus({ className = 'w-8 h-8', size, ...props }: IconProps) {
  return (
    <svg
      width={size || 36}
      height={size || 36}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* ID Card Outer Rectangle */}
      <rect
        x="4"
        y="6"
        width="28"
        height="24"
        rx="4"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      {/* Lanyard Clip Slot */}
      <rect x="14" y="9" width="8" height="2.5" rx="1" fill="currentColor" opacity="0.6" />
      {/* Card Photo Area */}
      <rect x="8" y="15" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="18" r="2" fill="currentColor" />
      {/* Text Lines */}
      <path d="M19 16H27M19 20H25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      {/* Verified Status Shield Badge */}
      <circle cx="27" cy="24" r="6" className="fill-indigo-600 stroke-white dark:stroke-slate-900" strokeWidth="2" />
      <path d="M24.5 24L26 25.5L29.5 22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Task-specific icon: Search Visitor
 * Shows a person silhouette inside a magnifying glass inspection beam.
 */
export function IconSearchVisitor({ className = 'w-8 h-8', size, ...props }: IconProps) {
  return (
    <svg
      width={size || 36}
      height={size || 36}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Magnifying Glass Frame */}
      <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="2.5" />
      <path d="M24 24L32 32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Person Silhouette inside Lens */}
      <circle cx="16" cy="12.5" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M10.5 22C10.5 19.5 12.8 17.5 16 17.5C19.2 17.5 21.5 19.5 21.5 22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Task-specific icon: Add Vendor / Commercial Supplies
 * Shows a vendor briefcase and checklist with an entry indicator.
 */
export function IconAddVendor({ className = 'w-8 h-8', size, ...props }: IconProps) {
  return (
    <svg
      width={size || 36}
      height={size || 36}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Briefcase Body */}
      <rect x="5" y="11" width="26" height="20" rx="3.5" stroke="currentColor" strokeWidth="2.5" />
      {/* Briefcase Handle */}
      <path
        d="M13 11V7C13 5.9 13.9 5 15 5H21C22.1 5 23 5.9 23 7V11"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      {/* Horizontal Divider Line */}
      <path d="M5 19H31" stroke="currentColor" strokeWidth="2" />
      {/* Central Latch */}
      <rect x="15.5" y="17" width="5" height="4" rx="1" fill="currentColor" />
      {/* Fast-Add Badge */}
      <circle cx="27" cy="24" r="5.5" className="fill-purple-600 stroke-white dark:stroke-slate-900" strokeWidth="2" />
      <path d="M27 21.5V26.5M24.5 24H29.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Task-specific icon: Currently Inside Facility
 * Shows a secure building/facility with visitor silhouettes and a live radar occupancy beacon.
 */
export function IconCurrentlyInside({ className = 'w-8 h-8', size, ...props }: IconProps) {
  return (
    <svg
      width={size || 36}
      height={size || 36}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Facility Roof & Structure */}
      <path
        d="M4 14L18 4L32 14V31C32 31.55 31.55 32 31 32H5C4.45 32 4 31.55 4 31V14Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* People Silhouettes Inside */}
      <circle cx="14" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 26C10 23.8 11.8 22 14 22C16.2 22 18 23.8 18 26" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="22" cy="19" r="2.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M19 26C19 24.2 20.3 22.8 22 22.8C23.7 22.8 25 24.2 25 26" stroke="currentColor" strokeWidth="1.8" />
      {/* Base line */}
      <path d="M2 32H34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Task-specific icon: Logout / Exit Checkpoint
 * Shows an open doorway with an outgoing exit arrow in distinct red.
 */
export function IconLogoutDoor({ className = 'w-6 h-6', size, ...props }: IconProps) {
  return (
    <svg
      width={size || 28}
      height={size || 28}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Door Frame */}
      <path
        d="M11 4H5C3.89543 4 3 4.89543 3 6V22C3 23.1046 3.89543 24 5 24H11"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Outgoing Arrow pointing outward */}
      <path
        d="M17 19L22 14M22 14L17 9M22 14H9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Task-specific icon: View Visitor Pass
 * Shows a hanging lanyard badge with photo and barcode.
 */
export function IconVisitorPass({ className = 'w-5 h-5', size, ...props }: IconProps) {
  return (
    <svg
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect x="4" y="5" width="16" height="17" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M9 5V3C9 2.45 9.45 2 10 2H14C14.55 2 15 2.45 15 3V5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 18C8 16.3 9.8 15 12 15C14.2 15 16 16.3 16 18" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Recognizable Pakistani Smart CNIC / National Identity Card Icon
 * Features ID card frame, header bar with crescent/star, smart IC chip, portrait box, and data lines.
 */
export function IconPakistaniCnic({ className = 'w-14 h-14', size, ...props }: IconProps) {
  return (
    <svg
      width={size || 56}
      height={size || 56}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Outer Scan Brackets */}
      <path
        d="M4 16V11C4 8.79086 5.79086 7 8 7H13M43 7H48C50.2091 7 52 8.79086 52 11V16M52 40V45C52 47.2091 50.2091 49 48 49H43M13 49H8C5.79086 49 4 47.2091 4 45V40"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* CNIC Card Body */}
      <rect
        x="8"
        y="12"
        width="40"
        height="32"
        rx="4"
        stroke="currentColor"
        strokeWidth="2.8"
      />
      {/* Top Green Flag Header Strip */}
      <path d="M9.5 18.5H46.5" stroke="currentColor" strokeWidth="2.2" />
      {/* Smart Chip on Left */}
      <rect
        x="12.5"
        y="22.5"
        width="7.5"
        height="6"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Data Lines in Middle */}
      <path
        d="M12.5 33H29M12.5 37.5H25"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M23 24H30M23 28H28"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* Citizen Portrait Frame on Right */}
      <rect
        x="33.5"
        y="22"
        width="10.5"
        height="13.5"
        rx="1.8"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="38.75" cy="26.5" r="2.2" fill="currentColor" />
      <path
        d="M35.5 33.5C35.5 31.6 36.9 30.2 38.75 30.2C40.6 30.2 42 31.6 42 33.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Recognizable Driving Licence Visual Icon
 * Features licence card frame, steering wheel / automobile emblem, driver portrait, and licence number strip.
 */
export function IconDrivingLicence({ className = 'w-14 h-14', size, ...props }: IconProps) {
  return (
    <svg
      width={size || 56}
      height={size || 56}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Outer Scan Brackets */}
      <path
        d="M4 16V11C4 8.79086 5.79086 7 8 7H13M43 7H48C50.2091 7 52 8.79086 52 11V16M52 40V45C52 47.2091 50.2091 49 48 49H43M13 49H8C5.79086 49 4 47.2091 4 45V40"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* Licence Card Body */}
      <rect
        x="8"
        y="12"
        width="40"
        height="32"
        rx="4"
        stroke="currentColor"
        strokeWidth="2.8"
      />
      {/* Header Banner */}
      <path d="M9.5 18.5H46.5" stroke="currentColor" strokeWidth="2.2" />
      {/* Driver Portrait on Left */}
      <rect
        x="12"
        y="22"
        width="10.5"
        height="13.5"
        rx="1.8"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="17.25" cy="26.5" r="2.2" fill="currentColor" />
      <path
        d="M14 33.5C14 31.6 15.4 30.2 17.25 30.2C19.1 30.2 20.5 31.6 20.5 33.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Steering Wheel Emblem on Right */}
      <circle cx="37.5" cy="29.5" r="6.5" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="37.5" cy="29.5" r="2" fill="currentColor" />
      <path
        d="M31.5 28.5H43.5M37.5 31.5V35.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Licence Text Lines */}
      <path
        d="M25.5 23.5H31M25.5 27.5H29.5M12.5 39H28"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}


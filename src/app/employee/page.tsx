'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  Shield,
  UserPlus,
  Users,
  Bell,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  Briefcase,
  Phone,
  Mail,
  Lock,
  CreditCard,
  Calendar,
  RefreshCw,
  LogOut,
  Sun,
  Moon,
  Languages,
  Upload,
  X,
  Check,
  Sparkles,
  DoorOpen,
  Search,
  RotateCcw,
} from 'lucide-react';
import GatekeeperLoader from '@/components/ui/GatekeeperLoader';
import type { EmployeeAuthUser } from '@/lib/auth';
import type {
  GuestInvitationRecord,
  EmployeeNotificationRecord,
} from '@/app/api/employee/invitations/route';

interface DepartmentOption {
  id: string;
  name: string;
}

const DURATION_PRESETS = [
  '30 Minutes',
  '1 Hour',
  '2 Hours',
  '3 Hours',
  'Half Day (4 Hours)',
  'Full Day',
];

function formatCnicInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
}

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime12h(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24;
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${suffix}`;
}

export default function EmployeePortalPage() {
  const { theme, toggleTheme } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const isUrdu = language === 'ur';

  // Portal state
  const [initialLoading, setInitialLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | null>(
    null
  );
  const [employee, setEmployee] = useState<EmployeeAuthUser | null>(null);
  const [applicant, setApplicant] = useState<EmployeeAuthUser | null>(null);

  // Auth tabs: 'login' | 'register'
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Registration fields
  const [regFullName, setRegFullName] = useState('');
  const [regDepartmentId, setRegDepartmentId] = useState('');
  const [regPosition, setRegPosition] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Approved Employee Dashboard state — ONLY TWO MAIN ACTIONS: 'INVITE' | 'HISTORY'
  const [activeAction, setActiveAction] = useState<'INVITE' | 'HISTORY'>('INVITE');
  const [invitations, setInvitations] = useState<GuestInvitationRecord[]>([]);
  const [notifications, setNotifications] = useState<EmployeeNotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [liveArrivalBanner, setLiveArrivalBanner] = useState<EmployeeNotificationRecord | null>(
    null
  );
  const knownNotificationIdsRef = useRef<Set<string>>(new Set());
  const initialNotificationsLoadedRef = useRef(false);

  // Invite Guest Form state
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [visitorCardNo, setVisitorCardNo] = useState('');
  const [guestCnic, setGuestCnic] = useState('');
  const [guestPhotoUrl, setGuestPhotoUrl] = useState<string | null>(null);
  const [visitDate, setVisitDate] = useState(getTodayDateString());
  const [expectedArrivalTime, setExpectedArrivalTime] = useState('14:00');
  const [durationPreset, setDurationPreset] = useState('1 Hour');
  const [customWindowText, setCustomWindowText] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Card availability state for Invite form
  const [cardCheckStatus, setCardCheckStatus] = useState<
    'idle' | 'checking' | 'available' | 'unavailable'
  >('idle');
  const [cardCheckMessage, setCardCheckMessage] = useState('');

  // Visited Guests search & filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'PENDING' | 'CHECKED_IN' | 'CHECKED_OUT'>('ALL');

  // Re-invite Modal state
  const [reinviteTarget, setReinviteTarget] = useState<GuestInvitationRecord | null>(null);
  const [reinviteGuestName, setReinviteGuestName] = useState('');
  const [reinvitePhone, setReinvitePhone] = useState('');
  const [reinviteCardNo, setReinviteCardNo] = useState('');
  const [reinviteCnic, setReinviteCnic] = useState('');
  const [reinvitePhotoUrl, setReinvitePhotoUrl] = useState<string | null>(null);
  const [reinviteDate, setReinviteDate] = useState(getTodayDateString());
  const [reinviteTime, setReinviteTime] = useState('14:00');
  const [reinviteDuration, setReinviteDuration] = useState('1 Hour');
  const [reinviteCardStatus, setReinviteCardStatus] = useState<
    'idle' | 'checking' | 'available' | 'unavailable'
  >('idle');
  const [reinviteCardMsg, setReinviteCardMsg] = useState('');
  const [reinviteSubmitting, setReinviteSubmitting] = useState(false);
  const [reinviteError, setReinviteError] = useState<string | null>(null);

  // Load active departments for registration dropdown
  useEffect(() => {
    let active = true;
    const fetchDepartments = async () => {
      try {
        const res = await fetch('/api/departments?activeOnly=true');
        if (res.ok) {
          const data = await res.json();
          if (active && Array.isArray(data.departments)) {
            setDepartments(data.departments);
            if (data.departments.length > 0 && !regDepartmentId) {
              setRegDepartmentId(data.departments[0].id);
            }
          }
        }
      } catch {
        // Non-fatal
      }
    };
    fetchDepartments();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll / check employee status (used on initial load AND while applicant is PENDING or REJECTED)
  const statusRequestInFlightRef = useRef(false);
  const checkEmployeeStatus = useCallback(async () => {
    if (statusRequestInFlightRef.current) return;
    statusRequestInFlightRef.current = true;
    try {
      const res = await fetch('/api/employee/status', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAuthenticated(Boolean(data.authenticated));
        setApprovalStatus(data.approvalStatus || null);
        setEmployee(data.employee || null);
        setApplicant(data.applicant || null);
      }
    } catch {
      // Ignore transient network errors during polling
    } finally {
      statusRequestInFlightRef.current = false;
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    const initTimer = setTimeout(() => {
      void checkEmployeeStatus();
    }, 0);
    return () => clearTimeout(initTimer);
  }, [checkEmployeeStatus]);

  // Real-time polling while applicant is on PENDING or REJECTED screen
  useEffect(() => {
    if (authenticated || (approvalStatus !== 'PENDING' && approvalStatus !== 'REJECTED')) {
      return;
    }
    const interval = setInterval(() => {
      void checkEmployeeStatus();
    }, 4000);
    return () => clearInterval(interval);
  }, [authenticated, approvalStatus, checkEmployeeStatus]);

  // Poll employee invitations & arrival notifications when authenticated & APPROVED
  const invitationsRequestInFlightRef = useRef(false);
  const fetchEmployeeInvitationsAndNotifications = useCallback(async () => {
    if (!authenticated || approvalStatus !== 'APPROVED') return;
    if (invitationsRequestInFlightRef.current) return;
    invitationsRequestInFlightRef.current = true;
    try {
      const res = await fetch('/api/employee/invitations', { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        await checkEmployeeStatus();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.invitations)) {
          setInvitations(data.invitations);
        }
        if (Array.isArray(data.notifications)) {
          const incoming: EmployeeNotificationRecord[] = data.notifications;
          if (!initialNotificationsLoadedRef.current) {
            incoming.forEach((n) => knownNotificationIdsRef.current.add(n.id));
            initialNotificationsLoadedRef.current = true;
          } else {
            const brandNewArrival = incoming.find(
              (n) => !knownNotificationIdsRef.current.has(n.id) && n.type === 'GUEST_ARRIVED'
            );
            incoming.forEach((n) => knownNotificationIdsRef.current.add(n.id));
            if (brandNewArrival) {
              setLiveArrivalBanner(brandNewArrival);
            }
          }
          setNotifications(incoming);
        }
        if (typeof data.unreadNotificationCount === 'number') {
          setUnreadCount(data.unreadNotificationCount);
        }
      }
    } catch {
      // Non-fatal polling error
    } finally {
      invitationsRequestInFlightRef.current = false;
    }
  }, [authenticated, approvalStatus, checkEmployeeStatus]);

  useEffect(() => {
    if (!authenticated || approvalStatus !== 'APPROVED') return;
    const initTimer = setTimeout(() => {
      void fetchEmployeeInvitationsAndNotifications();
    }, 0);
    const interval = setInterval(() => {
      void fetchEmployeeInvitationsAndNotifications();
    }, 5000);
    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, [authenticated, approvalStatus, fetchEmployeeInvitationsAndNotifications]);

  // Live card availability check for Invite Guest form
  useEffect(() => {
    if (!authenticated) return;
    const trimmed = visitorCardNo.trim();
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (!trimmed) {
        setCardCheckStatus('idle');
        setCardCheckMessage('');
        return;
      }
      setCardCheckStatus('checking');
      try {
        const res = await fetch(
          `/api/visits/card-availability?cardNo=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.available) {
            setCardCheckStatus('available');
            setCardCheckMessage(data.message || 'Card is available.');
          } else {
            setCardCheckStatus('unavailable');
            setCardCheckMessage(
              data.message || 'This card is already assigned. Please choose another available card.'
            );
          }
        }
      } catch {
        // Ignore aborted
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [visitorCardNo, authenticated]);

  // Live card availability check for Re-invite modal
  useEffect(() => {
    if (!reinviteTarget) return;
    const trimmed = reinviteCardNo.trim();
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (!trimmed) {
        setReinviteCardStatus('idle');
        setReinviteCardMsg('');
        return;
      }
      setReinviteCardStatus('checking');
      try {
        const res = await fetch(
          `/api/visits/card-availability?cardNo=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.available) {
            setReinviteCardStatus('available');
            setReinviteCardMsg(data.message || 'Card is available.');
          } else {
            setReinviteCardStatus('unavailable');
            setReinviteCardMsg(
              data.message || 'This card is currently in use. Please enter another available card.'
            );
          }
        }
      } catch {
        // Ignore aborted
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [reinviteCardNo, reinviteTarget]);

  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);
    setAuthSubmitting(true);
    try {
      const res = await fetch('/api/employee/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Failed to sign in.');
        return;
      }

      setAuthenticated(Boolean(data.authenticated));
      setApprovalStatus(data.approvalStatus || null);
      setEmployee(data.employee || null);
      setApplicant(data.applicant || data.employee || null);
      setLoginPassword('');
    } catch {
      setAuthError('Network error while signing in. Please try again.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleEmployeeRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    if (regPassword !== regConfirmPassword) {
      setAuthError('Password and Confirm Password do not match.');
      return;
    }

    setAuthSubmitting(true);
    try {
      const res = await fetch('/api/employee/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regFullName.trim(),
          departmentId: regDepartmentId,
          position: regPosition.trim(),
          phoneNumber: regPhone.trim(),
          email: regEmail.trim(),
          password: regPassword,
          confirmPassword: regConfirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Failed to submit registration request.');
        return;
      }

      setAuthenticated(false);
      setApprovalStatus('PENDING');
      setApplicant(data.applicant || null);
      setRegPassword('');
      setRegConfirmPassword('');
      setAuthSuccessMsg(
        data.message ||
          'Registration request submitted! Your status will update automatically once reviewed by Admin.'
      );
    } catch {
      setAuthError('Network error while submitting registration. Please try again.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleEmployeeLogout = async () => {
    try {
      await fetch('/api/employee/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    setAuthenticated(false);
    setApprovalStatus(null);
    setEmployee(null);
    setApplicant(null);
    setInvitations([]);
    setNotifications([]);
    setUnreadCount(0);
    knownNotificationIdsRef.current.clear();
    initialNotificationsLoadedRef.current = false;
  };

  const handlePhotoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onPhotoReady: (dataUrl: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 480;
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          onPhotoReady(canvas.toDataURL('image/jpeg', 0.82));
        }
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const computeExpectedWindowString = (arrivalTime: string, preset: string, custom: string) => {
    const formattedStart = formatTime12h(arrivalTime);
    if (custom.trim()) {
      return custom.trim();
    }
    return `${formattedStart} (${preset})`;
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);

    if (cardCheckStatus === 'unavailable') {
      setInviteError(
        cardCheckMessage ||
          'The selected Visitor Card Number is not available. Please enter another card number.'
      );
      return;
    }

    setInviteSubmitting(true);
    try {
      const idempotencyKey = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const expectedDurationWindow = computeExpectedWindowString(
        expectedArrivalTime,
        durationPreset,
        customWindowText
      );

      const res = await fetch('/api/employee/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
          visitorCardNo: visitorCardNo.trim(),
          guestCnic: guestCnic.trim() || undefined,
          guestPhotoUrl,
          visitDate,
          expectedArrivalTime: formatTime12h(expectedArrivalTime),
          expectedDurationWindow,
          idempotencyKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || 'Failed to create guest invitation.');
        return;
      }

      setInviteSuccess(
        `Invitation created for ${guestName.trim()} (Card ${data.invitation?.visitorCardNo || visitorCardNo.trim()}). All gate operators can now see this guest in Upcoming Guests.`
      );
      setGuestName('');
      setGuestPhone('');
      setVisitorCardNo('');
      setGuestCnic('');
      setGuestPhotoUrl(null);
      setCustomWindowText('');
      setCardCheckStatus('idle');
      setCardCheckMessage('');
      await fetchEmployeeInvitationsAndNotifications();
    } catch {
      setInviteError('Network error while creating invitation. Please try again.');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const openReinviteModal = (record: GuestInvitationRecord) => {
    setReinviteTarget(record);
    setReinviteGuestName(record.guestName);
    setReinvitePhone(record.guestPhone);
    setReinviteCardNo(record.visitorCardNo);
    setReinviteCnic(record.guestCnic || '');
    setReinvitePhotoUrl(record.guestPhotoUrl || null);
    setReinviteDate(getTodayDateString());
    setReinviteTime('14:00');
    setReinviteDuration('1 Hour');
    setReinviteError(null);
  };

  const handleReinviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reinviteTarget) return;
    setReinviteError(null);

    if (reinviteCardStatus === 'unavailable') {
      setReinviteError(
        reinviteCardMsg ||
          'This Visitor Card Number is currently in use. Please enter an available card number.'
      );
      return;
    }

    setReinviteSubmitting(true);
    try {
      const idempotencyKey = `reinv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const expectedDurationWindow = `${formatTime12h(reinviteTime)} (${reinviteDuration})`;

      const res = await fetch('/api/employee/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: reinviteGuestName.trim(),
          guestPhone: reinvitePhone.trim(),
          visitorCardNo: reinviteCardNo.trim(),
          guestCnic: reinviteCnic.trim() || undefined,
          guestPhotoUrl: reinvitePhotoUrl,
          visitDate: reinviteDate,
          expectedArrivalTime: formatTime12h(reinviteTime),
          expectedDurationWindow,
          reinvitedFromId: reinviteTarget.id,
          idempotencyKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReinviteError(data.error || 'Failed to re-invite guest.');
        return;
      }

      setReinviteTarget(null);
      setInviteSuccess(
        `Re-invited ${reinviteGuestName.trim()} with Card ${data.invitation?.visitorCardNo}. Shared with all gate operators.`
      );
      await fetchEmployeeInvitationsAndNotifications();
    } catch {
      setReinviteError('Network error while re-inviting guest.');
    } finally {
      setReinviteSubmitting(false);
    }
  };

  const handleMarkNotificationsRead = async (notificationId?: string) => {
    try {
      await fetch('/api/employee/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      await fetchEmployeeInvitationsAndNotifications();
    } catch {
      // Ignore
    }
  };

  if (initialLoading) {
    return (
      <GatekeeperLoader
        variant="fullscreen"
        title={t('loading_gatekeeper', 'Loading Employee Portal...')}
      />
    );
  }

  const filteredHistory = invitations.filter((inv) => {
    if (historyFilter !== 'ALL' && inv.status !== historyFilter) return false;
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    return (
      inv.guestName.toLowerCase().includes(q) ||
      inv.guestPhone.toLowerCase().includes(q) ||
      inv.visitorCardNo.toLowerCase().includes(q) ||
      (inv.guestCnic && inv.guestCnic.toLowerCase().includes(q)) ||
      (inv.entryGateName && inv.entryGateName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0c121e]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white leading-none">
                GATE KEEPER
              </h1>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {t('emp_portal_title', 'Employee Portal')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">
              {t('emp_portal_subtitle', 'Invite guests and view your visited guest history')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Switch */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Languages className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{language === 'ur' ? 'English' : 'اردو'}</span>
          </button>

          {/* Theme Switch */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            title="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
          </button>

          {/* Authenticated Employee Controls: Arrival Notifications Bell & Logout */}
          {authenticated && employee && (
            <>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    const nextOpen = !isNotificationsOpen;
                    setIsNotificationsOpen(nextOpen);
                    if (nextOpen && unreadCount > 0) {
                      handleMarkNotificationsRead();
                    }
                  }}
                  className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
                  title={t('emp_arrival_notifications', 'Guest Arrival Notifications')}
                >
                  <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                        {t('emp_arrival_notifications', 'Guest Arrival Notifications')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsNotificationsOpen(false)}
                        className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          No guest arrival notifications yet. You will be notified here in real time when your invited guest checks in at any gate.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-3.5 text-xs space-y-1 ${
                              !n.isRead
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/30'
                                : 'bg-white dark:bg-slate-900'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                                <DoorOpen className="w-3.5 h-3.5 shrink-0" />
                                {n.title}
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {new Date(n.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                              {n.message}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {employee.name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                    {employee.departmentName} &bull; {employee.position}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleEmployeeLogout}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('logout', 'Logout')}</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        {/* =================================================================== */}
        {/* 1. APPLICANT STATUS VIEW (PENDING OR REJECTED) — REAL-TIME POLLING */}
        {/* =================================================================== */}
        {!authenticated && (approvalStatus === 'PENDING' || approvalStatus === 'REJECTED') && applicant ? (
          <div className="max-w-xl mx-auto mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
            <div
              className={`p-6 text-white ${
                approvalStatus === 'PENDING'
                  ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600'
                  : 'bg-gradient-to-r from-rose-600 via-rose-500 to-red-600'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs">
                  {approvalStatus === 'PENDING' ? (
                    <>
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      PENDING ADMIN APPROVAL
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      NOT APPROVED
                    </>
                  )}
                </span>
                <span className="text-[11px] font-semibold text-white/90 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  Live Status Sync
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold mt-4">
                {approvalStatus === 'PENDING'
                  ? t('emp_status_pending_title', 'Registration Pending Approval')
                  : t('emp_status_rejected_title', 'Registration Request Not Approved')}
              </h2>
              <p className="text-xs sm:text-sm text-white/90 mt-1 leading-relaxed">
                {approvalStatus === 'PENDING'
                  ? t(
                      'emp_status_pending_desc',
                      'Your employee account request has been received. This screen updates automatically as soon as an administrator approves your request.'
                    )
                  : t(
                      'emp_status_rejected_desc',
                      'Your employee registration request was not approved by the administrator.'
                    )}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {authSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{authSuccessMsg}</span>
                </div>
              )}

              {approvalStatus === 'REJECTED' && applicant.rejectionReason && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 space-y-1">
                  <p className="font-bold uppercase tracking-wider text-[10px] text-rose-600 dark:text-rose-400">
                    Administrator Note
                  </p>
                  <p className="font-medium">{applicant.rejectionReason}</p>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/70 dark:border-slate-700/60">
                  <span className="text-slate-500">Full Name</span>
                  <span className="font-bold text-slate-900 dark:text-white">{applicant.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/70 dark:border-slate-700/60">
                  <span className="text-slate-500">Department</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {applicant.departmentName || 'General'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/70 dark:border-slate-700/60">
                  <span className="text-slate-500">Position</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {applicant.position || '—'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/70 dark:border-slate-700/60">
                  <span className="text-slate-500">Phone Number</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {applicant.phoneNumber || '—'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Email Address</span>
                  <span className="font-bold text-slate-900 dark:text-white">{applicant.email}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={checkEmployeeStatus}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Check Status Now</span>
                </button>

                <button
                  type="button"
                  onClick={handleEmployeeLogout}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          </div>
        ) : !authenticated ? (
          /* =================================================================== */
          /* 2. UNAUTHENTICATED VIEW — EMPLOYEE SIGN IN & REGISTRATION           */
          /* =================================================================== */
          <div className="max-w-lg mx-auto mt-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
              {/* Portal Banner */}
              <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 text-white">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/15">
                  Gatekeeper Employee Access
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold mt-2">
                  {t('emp_portal_title', 'Employee Guest Portal')}
                </h2>
                <p className="text-xs text-blue-100 mt-1">
                  {t(
                    'emp_portal_subtitle',
                    'Sign in to invite guests or submit a first-time employee registration request.'
                  )}
                </p>
              </div>

              {/* Mode Tabs */}
              <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-1.5 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('login');
                    setAuthError(null);
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    authTab === 'login'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  {t('emp_sign_in_tab', 'Employee Sign In')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('register');
                    setAuthError(null);
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    authTab === 'register'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  {t('emp_register_tab', 'First-Time Registration')}
                </button>
              </div>

              <div className="p-6">
                {authError && (
                  <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                {authTab === 'login' ? (
                  <form onSubmit={handleEmployeeLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t('emp_email', 'Email Address')} *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="employee@company.com"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t('emp_password', 'Password')} *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={authSubmitting}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-extrabold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                    >
                      {authSubmitting
                        ? 'Signing in...'
                        : t('emp_sign_in_tab', 'Sign In to Employee Portal')}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleEmployeeRegister} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {t('emp_full_name', 'Full Name')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="e.g. Ahmed Raza"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t('emp_department', 'Department')} *
                        </label>
                        <div className="relative">
                          <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <select
                            required
                            value={regDepartmentId}
                            onChange={(e) => setRegDepartmentId(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="" disabled>
                              Select Department
                            </option>
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t('emp_position', 'Position / Designation')} *
                        </label>
                        <div className="relative">
                          <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            value={regPosition}
                            onChange={(e) => setRegPosition(e.target.value)}
                            placeholder="e.g. Senior Manager"
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t('emp_phone', 'Phone Number')} *
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            required
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            placeholder="03001234567"
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t('emp_email', 'Email Address')} *
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            required
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="name@company.com"
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t('emp_password', 'Password')} *
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t('emp_confirm_password', 'Confirm Password')} *
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={authSubmitting}
                      className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-extrabold shadow-md shadow-emerald-500/20 transition-all cursor-pointer mt-2"
                    >
                      {authSubmitting
                        ? 'Submitting Request...'
                        : t('emp_submit_registration', 'Submit Registration Request')}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* =================================================================== */
          /* 3. AUTHENTICATED EMPLOYEE DASHBOARD (APPROVED ONLY)                 */
          /*    Strictly Two Main Actions: 1. Invite Guest  2. Visited Guests    */
          /* =================================================================== */
          <div className="space-y-6">
            {/* Real-Time Arrival Alert Toast/Banner */}
            {liveArrivalBanner && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg flex items-center justify-between gap-4 animate-in fade-in-0 slide-in-from-top-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-100">
                      {liveArrivalBanner.title}
                    </p>
                    <p className="text-sm font-bold mt-0.5">{liveArrivalBanner.message}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLiveArrivalBanner(null)}
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Two Main Action Cards (Strictly 2 Actions as Required by Section 5) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Action 1: Invite Guest */}
              <button
                type="button"
                onClick={() => setActiveAction('INVITE')}
                className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-4 ${
                  activeAction === 'INVITE'
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 shadow-md shadow-blue-500/10'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400'
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                    activeAction === 'INVITE'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                      : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                  }`}
                >
                  <UserPlus className="w-7 h-7" />
                </div>
                <div className={`min-w-0 flex-1 ${isUrdu ? 'text-right' : 'text-left'}`}>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                    {t('emp_action_invite_guest', 'Invite Guest')}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t(
                      'emp_action_invite_guest_desc',
                      'Pre-register an upcoming guest and assign an available visitor card'
                    )}
                  </p>
                </div>
              </button>

              {/* Action 2: Visited Guests */}
              <button
                type="button"
                onClick={() => setActiveAction('HISTORY')}
                className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-4 ${
                  activeAction === 'HISTORY'
                    ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-md shadow-emerald-500/10'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-400'
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                    activeAction === 'HISTORY'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  <Users className="w-7 h-7" />
                </div>
                <div className={`min-w-0 flex-1 ${isUrdu ? 'text-right' : 'text-left'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                      {t('emp_action_visited_guests', 'Visited Guests')}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {invitations.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t(
                      'emp_action_visited_guests_desc',
                      'View your invited and visited guest history and re-invite returning guests'
                    )}
                  </p>
                </div>
              </button>
            </div>

            {/* =============================================================== */}
            {/* ACTION 1 PANEL: INVITE GUEST FORM                               */}
            {/* =============================================================== */}
            {activeAction === 'INVITE' ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {t('emp_action_invite_guest', 'Invite Guest')}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Your invitation is immediately shared with all gate operators across every gate.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    Host: {employee?.name} ({employee?.departmentName})
                  </span>
                </div>

                <form onSubmit={handleCreateInvitation} className="p-6 space-y-5">
                  {inviteError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{inviteError}</span>
                    </div>
                  )}

                  {inviteSuccess && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{inviteSuccess}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInviteSuccess(null)}
                        className="text-emerald-700 dark:text-emerald-300 hover:underline text-[11px] shrink-0 cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Guest Name (Required) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t('emp_guest_name', 'Guest Name')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Enter guest's full name"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Phone Number (Required) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t('emp_guest_phone', 'Guest Phone Number')} *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          placeholder="03001234567"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Visitor Card Number (Required, Manual, Validated) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t('emp_guest_card_no', 'Visitor Card Number')} *
                      </label>
                      <div className="relative">
                        <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={visitorCardNo}
                          onChange={(e) => setVisitorCardNo(e.target.value.toUpperCase())}
                          placeholder="e.g. C-01 or 105"
                          className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm font-mono font-bold focus:outline-none focus:ring-2 ${
                            cardCheckStatus === 'unavailable'
                              ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-950/30 focus:ring-rose-500'
                              : cardCheckStatus === 'available'
                              ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/30 focus:ring-emerald-500'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 focus:ring-blue-500'
                          }`}
                        />
                      </div>
                      {cardCheckStatus !== 'idle' && (
                        <p
                          className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${
                            cardCheckStatus === 'available'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : cardCheckStatus === 'unavailable'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {cardCheckStatus === 'checking' && 'Checking card availability...'}
                          {cardCheckStatus === 'available' && (
                            <>
                              <Check className="w-3.5 h-3.5" /> {cardCheckMessage}
                            </>
                          )}
                          {cardCheckStatus === 'unavailable' && (
                            <>
                              <AlertCircle className="w-3.5 h-3.5" /> {cardCheckMessage}
                            </>
                          )}
                        </p>
                      )}
                    </div>

                    {/* CNIC (Optional) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t('emp_guest_cnic_optional', 'CNIC Number (Optional)')}
                      </label>
                      <input
                        type="text"
                        value={guestCnic}
                        onChange={(e) => setGuestCnic(formatCnicInput(e.target.value))}
                        placeholder="35202-1234567-1 (Optional)"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Visit Date, Arrival Time, and Expected Visit Duration/Window */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t('emp_visit_date', 'Visit Date')} *
                      </label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="date"
                          required
                          min={getTodayDateString()}
                          value={visitDate}
                          onChange={(e) => setVisitDate(e.target.value)}
                          className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t('emp_expected_arrival', 'Expected Arrival Time')} *
                      </label>
                      <div className="relative">
                        <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="time"
                          required
                          value={expectedArrivalTime}
                          onChange={(e) => setExpectedArrivalTime(e.target.value)}
                          className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t('emp_expected_window', 'Expected Visit Duration / Window')} *
                      </label>
                      <select
                        value={durationPreset}
                        onChange={(e) => setDurationPreset(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {DURATION_PRESETS.map((preset) => (
                          <option key={preset} value={preset}>
                            {preset}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Custom Visit Time Window (Optional override, e.g. 2:00 PM – 3:00 PM)
                      </label>
                      <input
                        type="text"
                        value={customWindowText}
                        onChange={(e) => setCustomWindowText(e.target.value)}
                        placeholder={`Default: ${formatTime12h(expectedArrivalTime)} (${durationPreset})`}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Guest Photo (Optional) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t('emp_guest_photo_optional', 'Guest Photo (Optional)')}
                      </label>
                      <div className="flex items-center gap-3">
                        {guestPhotoUrl ? (
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={guestPhotoUrl}
                              alt="Guest"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setGuestPhotoUrl(null)}
                              className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-slate-900/80 text-white cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : null}
                        <label className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer bg-slate-50/50 dark:bg-slate-800/40">
                          <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>{guestPhotoUrl ? 'Change Guest Photo' : 'Upload Guest Photo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePhotoUpload(e, setGuestPhotoUrl)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={inviteSubmitting || cardCheckStatus === 'unavailable'}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-extrabold shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>
                        {inviteSubmitting
                          ? 'Sending Invitation...'
                          : t('emp_create_invitation_btn', 'Send Guest Invitation to Gates')}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* =============================================================== */
              /* ACTION 2 PANEL: VISITED GUESTS (HISTORY & RE-INVITE)            */
              /* =============================================================== */
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {t('emp_action_visited_guests', 'Visited Guests')}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Your personal guest invitation &amp; check-in/check-out history. Use Re-invite for returning guests.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        placeholder="Search guest, card, gate..."
                        className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <select
                      value={historyFilter}
                      onChange={(e) =>
                        setHistoryFilter(
                          e.target.value as 'ALL' | 'PENDING' | 'CHECKED_IN' | 'CHECKED_OUT'
                        )
                      }
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="PENDING">Pending Arrival</option>
                      <option value="CHECKED_IN">Currently Inside</option>
                      <option value="CHECKED_OUT">Checked Out</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {filteredHistory.length === 0 ? (
                    <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                      <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                      <p className="font-semibold text-slate-500 dark:text-slate-400">
                        No guest records match your filter.
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs min-w-[820px]">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-5 py-3">Guest</th>
                          <th className="px-4 py-3">Visitor Card #</th>
                          <th className="px-4 py-3">Visit Date &amp; Expected Window</th>
                          <th className="px-4 py-3">Actual Check-In</th>
                          <th className="px-4 py-3">Actual Check-Out</th>
                          <th className="px-4 py-3">Actual Gate Used</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-5 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filteredHistory.map((inv) => (
                          <tr
                            key={inv.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                                  {inv.guestPhotoUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                      src={inv.guestPhotoUrl}
                                      alt={inv.guestName}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Users className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white">
                                    {inv.guestName}
                                  </p>
                                  <p className="text-[11px] font-mono text-slate-500">
                                    {inv.guestPhone}
                                    {inv.guestCnic ? ` • ${inv.guestCnic}` : ''}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3.5 font-mono font-extrabold text-blue-600 dark:text-blue-400">
                              {inv.visitorCardNo}
                            </td>

                            <td className="px-4 py-3.5">
                              <p className="font-bold text-slate-800 dark:text-slate-200">
                                {inv.visitDate}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {inv.expectedArrivalTime} &bull; {inv.expectedDurationWindow}
                              </p>
                            </td>

                            <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                              {inv.actualCheckInTime
                                ? new Date(inv.actualCheckInTime).toLocaleString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '—'}
                            </td>

                            <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                              {inv.actualCheckOutTime
                                ? new Date(inv.actualCheckOutTime).toLocaleString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '—'}
                            </td>

                            <td className="px-4 py-3.5">
                              {inv.entryGateName ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                                  {inv.entryGateName}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">
                                  Assigned on Arrival
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                  inv.status === 'CHECKED_IN'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                    : inv.status === 'CHECKED_OUT'
                                    ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                                }`}
                              >
                                {inv.status === 'CHECKED_IN'
                                  ? 'CHECKED IN'
                                  : inv.status === 'CHECKED_OUT'
                                  ? 'CHECKED OUT'
                                  : 'PENDING ARRIVAL'}
                              </span>
                            </td>

                            <td className="px-5 py-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => openReinviteModal(inv)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>{t('emp_reinvite_btn', 'Re-invite')}</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Re-Invite Guest Modal */}
      {reinviteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {t('emp_reinvite_btn', 'Re-invite')} — {reinviteTarget.guestName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Creates a new invitation without overwriting previous visit history.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReinviteTarget(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReinviteSubmit} className="p-6 space-y-4">
              {reinviteError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{reinviteError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Guest Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={reinviteGuestName}
                    onChange={(e) => setReinviteGuestName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={reinvitePhone}
                    onChange={(e) => setReinvitePhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Visitor Card Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={reinviteCardNo}
                    onChange={(e) => setReinviteCardNo(e.target.value.toUpperCase())}
                    className={`w-full px-3 py-2 rounded-xl border text-sm font-mono font-bold ${
                      reinviteCardStatus === 'unavailable'
                        ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-950/30'
                        : reinviteCardStatus === 'available'
                        ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                    }`}
                  />
                  {reinviteCardStatus !== 'idle' && (
                    <p
                      className={`text-[11px] font-semibold mt-1 ${
                        reinviteCardStatus === 'available'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : reinviteCardStatus === 'unavailable'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {reinviteCardStatus === 'checking'
                        ? 'Checking card availability...'
                        : reinviteCardMsg}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    CNIC (Optional)
                  </label>
                  <input
                    type="text"
                    value={reinviteCnic}
                    onChange={(e) => setReinviteCnic(formatCnicInput(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    New Visit Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={getTodayDateString()}
                    value={reinviteDate}
                    onChange={(e) => setReinviteDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Expected Arrival *
                  </label>
                  <input
                    type="time"
                    required
                    value={reinviteTime}
                    onChange={(e) => setReinviteTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Visit Window *
                  </label>
                  <select
                    value={reinviteDuration}
                    onChange={(e) => setReinviteDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  >
                    {DURATION_PRESETS.map((preset) => (
                      <option key={preset} value={preset}>
                        {preset}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setReinviteTarget(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reinviteSubmitting || reinviteCardStatus === 'unavailable'}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-extrabold shadow-md cursor-pointer"
                >
                  {reinviteSubmitting ? 'Sending Re-invitation...' : 'Confirm & Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

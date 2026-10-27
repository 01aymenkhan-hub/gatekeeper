'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import {
  X,
  Users,
  Search,
  Calendar,
  Clock,
  CreditCard,
  Building2,
  Phone,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { playRegistrationSuccessSound, playSelectSound } from '@/utils/interactionSound';
import type { GuestInvitationRecord } from '@/app/api/employee/invitations/route';

interface UpcomingGuestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitations: GuestInvitationRecord[];
  pendingCount: number;
  onRefresh: () => Promise<void> | void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCheckInSuccess: (visit: any) => void;
}

export default function UpcomingGuestsModal({
  isOpen,
  onClose,
  invitations,
  pendingCount,
  onRefresh,
  onCheckInSuccess,
}: UpcomingGuestsModalProps) {
  const { language, t } = useLanguage();
  const { currentGate, user } = useAuth();
  const isUrdu = language === 'ur' && user?.role !== 'ADMIN';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvitation, setSelectedInvitation] = useState<GuestInvitationRecord | null>(null);
  const [vehicleNo, setVehicleNo] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  if (!isOpen) return null;

  const filtered = invitations.filter((inv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.guestName.toLowerCase().includes(q) ||
      inv.guestPhone.toLowerCase().includes(q) ||
      inv.visitorCardNo.toLowerCase().includes(q) ||
      inv.employeeName.toLowerCase().includes(q) ||
      inv.departmentName.toLowerCase().includes(q) ||
      (inv.guestCnic && inv.guestCnic.toLowerCase().includes(q))
    );
  });

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenConfirmCheckIn = (inv: GuestInvitationRecord) => {
    if (user?.role !== 'ADMIN') {
      playSelectSound();
    }
    setErrorBanner(null);
    setVehicleNo('');
    setNotes('');
    setSelectedInvitation(inv);
  };

  const handleCompleteCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvitation) return;
    setErrorBanner(null);
    setSubmittingId(selectedInvitation.id);

    try {
      const res = await fetch(`/api/invitations/${selectedInvitation.id}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryGateId: currentGate?.id || undefined,
          confirmedCardNo: selectedInvitation.visitorCardNo,
          vehicleNo: vehicleNo.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(
          data.error || 'Could not complete check-in. This guest may have already been checked in.'
        );
        // Refresh shared list immediately on 409 Conflict
        await onRefresh();
        if (res.status === 409) {
          setSelectedInvitation(null);
        }
        return;
      }

      playRegistrationSuccessSound();
      setSelectedInvitation(null);
      await onRefresh();
      onCheckInSuccess(data.visit);
    } catch {
      setErrorBanner('Network error while checking in invited guest. Please try again.');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-5xl max-h-[92vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-700 via-blue-600 to-blue-700 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <div className={isUrdu ? 'text-right' : 'text-left'}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-xl font-extrabold tracking-tight">
                  {t('upcoming_guests_title', 'Upcoming Invited Guests')}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-400 text-slate-950">
                  {pendingCount}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-blue-100 mt-0.5">
                {t(
                  'upcoming_guests_subtitle',
                  'Shared across all gates — check in invited guests upon arrival'
                )}{' '}
                &bull; {t('active_gate', 'Active Gate')}:{' '}
                <strong>{currentGate?.name || 'Main Gate'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleManualRefresh}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Alert Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guest name, card #, phone, CNIC, or host..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing <strong>{filtered.length}</strong> pending invitation
            {filtered.length === 1 ? '' : 's'} (shared across all gates)
          </div>
        </div>

        {errorBanner && (
          <div className="mx-4 mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-rose-600 hover:underline text-[11px] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Body: Either Confirm Check-In View OR Shared Pending Invitations List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {selectedInvitation ? (
            <div className="max-w-xl mx-auto rounded-2xl border-2 border-emerald-500/40 dark:border-emerald-700 bg-emerald-50/20 dark:bg-slate-800/50 p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                      {t('confirm_guest_checkin_title', 'Confirm Invited Guest Check-In')}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Verify guest identity and hand over the preassigned physical Visitor Card.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedInvitation(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Back to List
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Guest Name &amp; Phone
                  </span>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {selectedInvitation.guestName}
                  </p>
                  <p className="font-mono text-slate-600 dark:text-slate-300">
                    {selectedInvitation.guestPhone}
                    {selectedInvitation.guestCnic ? ` • CNIC: ${selectedInvitation.guestCnic}` : ''}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    {t('preassigned_card', 'Preassigned Visitor Card #')}
                  </span>
                  <p className="text-lg font-mono font-extrabold text-blue-700 dark:text-blue-300">
                    {selectedInvitation.visitorCardNo}
                  </p>
                  <p className="text-[10px] text-blue-600/80 dark:text-blue-300/80">
                    Reserved by inviting employee (locked)
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t('invited_by_host', 'Invited By (Host & Department)')}
                  </span>
                  <p className="font-extrabold text-slate-900 dark:text-white">
                    {selectedInvitation.employeeName}
                  </p>
                  <p className="text-slate-500">{selectedInvitation.departmentName}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Actual Entry Gate &amp; Schedule
                  </span>
                  <p className="font-extrabold text-emerald-700 dark:text-emerald-400">
                    {currentGate?.name || 'Main Gate'}
                  </p>
                  <p className="text-slate-500">
                    {selectedInvitation.visitDate} &bull; {selectedInvitation.expectedDurationWindow}
                  </p>
                </div>
              </div>

              <form onSubmit={handleCompleteCheckIn} className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Vehicle Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={vehicleNo}
                      onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                      placeholder="e.g. LEA-1234"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Gate Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional check-in remark"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedInvitation(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingId === selectedInvitation.id}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs sm:text-sm font-extrabold shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {submittingId === selectedInvitation.id
                        ? 'Checking In Guest...'
                        : `Complete Check-In (Card ${selectedInvitation.visitorCardNo})`}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center space-y-3 text-slate-400">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Users className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                {t('upcoming_guests_empty', 'No pending guest invitations right now.')}
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                When any employee invites a guest from the Employee Portal (/employee), the guest will appear here automatically for all gate operators.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-600 shadow-xs transition-all flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 overflow-hidden flex items-center justify-center shrink-0">
                        {inv.guestPhotoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={inv.guestPhotoUrl}
                            alt={inv.guestName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                            {inv.guestName}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                            PENDING
                          </span>
                        </div>
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 shrink-0" />
                          <span>{inv.guestPhone}</span>
                          {inv.guestCnic && <span>&bull; {inv.guestCnic}</span>}
                        </p>
                      </div>
                    </div>

                    {/* Preassigned Visitor Card Badge */}
                    <div className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-right shrink-0 shadow-xs">
                      <span className="block text-[9px] uppercase font-bold tracking-wider text-blue-100">
                        Card #
                      </span>
                      <span className="font-mono text-xs sm:text-sm font-extrabold">
                        {inv.visitorCardNo}
                      </span>
                    </div>
                  </div>

                  {/* Host, Department & Schedule Info */}
                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {t('invited_by_host', 'Invited By (Host)')}
                      </span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                        {inv.employeeName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{inv.departmentName}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {t('expected_schedule', 'Expected Schedule')}
                      </span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                        {inv.visitDate}
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{inv.expectedDurationWindow}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenConfirmCheckIn(inv)}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>
                      {t('verify_and_checkin_btn', 'Verify & Check In Guest')} ({inv.visitorCardNo})
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

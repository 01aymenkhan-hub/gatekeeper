'use client';

import React from 'react';
import { Check, Printer, IdCard, UserPlus, X, Building, DoorOpen, ShieldCheck } from 'lucide-react';

interface RegistrationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: any;
  onViewCard: () => void;
  onPrintBadge: () => void;
  onRegisterNext: () => void;
}

export default function RegistrationSuccessModal({
  isOpen,
  onClose,
  visit,
  onViewCard,
  onPrintBadge,
  onRegisterNext,
}: RegistrationSuccessModalProps) {
  if (!isOpen || !visit) return null;

  const person = visit.person || {};
  const visitorCardNo = visit.visitorCardNo || 'N/A';
  const visitNumber = visit.visitNumber || 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 sm:p-8 text-center relative animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success Icon */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm mb-4">
          <Check className="w-7 h-7 stroke-[2.5]" />
        </div>

        {/* Title & Description */}
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Registration Successful
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-xs mx-auto">
          Visitor entry has been verified and registered. The visitor can now proceed.
        </p>

        {/* Key Operational Pass Highlight Box */}
        <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-left space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Visitor Name
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
              {person.fullName || visit.hostName || 'Registered Visitor'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Visitor Card Badge #
            </span>
            <span className="text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {visitorCardNo}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Visit To
            </span>
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
              {visit.hostName} ({visit.department})
            </span>
          </div>

          {visit.entryGate && (
            <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Entry Gate
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {visit.entryGate.name}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={onPrintBadge}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Badge</span>
            </button>

            <button
              onClick={onViewCard}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <IdCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>View Card</span>
            </button>
          </div>

          <button
            onClick={onRegisterNext}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Register Next Visitor</span>
          </button>
        </div>
      </div>
    </div>
  );
}

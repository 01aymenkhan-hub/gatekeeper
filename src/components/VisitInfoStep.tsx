"use client";

import React from "react";
import { VisitInfoData } from "../types/visitor";

interface VisitInfoStepProps {
  data: VisitInfoData;
  onChange: (updated: VisitInfoData) => void;
  onNext: () => void;
}

export default function VisitInfoStep({
  data,
  onChange,
  onNext,
}: VisitInfoStepProps) {
  const isMeetNameValid = data.meetName.trim().length > 0;
  const isDepartmentValid = data.department.trim().length > 0;
  const isFormValid = isMeetNameValid && isDepartmentValid;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
  };

  const labelClass = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5";
  const inputClass =
    "block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors shadow-2xs";

  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-6 sm:p-7">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Visit Information</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Please enter the host details for this visitor registration
          </p>
        </div>

        <div className="space-y-5">
          {/* 1. Visitor is here to meet */}
          <div>
            <label htmlFor="meetName" className={labelClass}>
              Visitor is here to meet <span className="text-red-500">*</span>
            </label>
            <input
              id="meetName"
              name="meetName"
              type="text"
              value={data.meetName}
              onChange={handleChange}
              placeholder="e.g. Muhammad Asif (Manager)"
              className={inputClass}
              autoFocus
            />
          </div>

          {/* 2. Department */}
          <div>
            <label htmlFor="department" className={labelClass}>
              Department <span className="text-red-500">*</span>
            </label>
            <input
              id="department"
              name="department"
              type="text"
              value={data.department}
              onChange={handleChange}
              placeholder="e.g. Accounts, Production, IT"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Next Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onNext}
          disabled={!isFormValid}
          className={`w-full py-3.5 px-6 rounded-xl text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition-all ${
            isFormValid
              ? "bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white cursor-pointer"
              : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed shadow-none"
          }`}
        >
          <span>Continue to Document Verification</span>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </button>
        {!isFormValid && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2">
            Please fill in both required fields to continue
          </p>
        )}
      </div>
    </div>
  );
}

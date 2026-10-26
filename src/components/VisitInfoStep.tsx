"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Users,
  Briefcase,
  UserCheck,
  Award,
  HardHat,
  Truck,
  Check,
  ArrowLeft,
  Building2,
  User,
  Search,
  AlertCircle,
} from "lucide-react";
import { VisitInfoData } from "../types/visitor";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

interface VisitInfoStepProps {
  data: VisitInfoData;
  onChange: (updated: VisitInfoData) => void;
  onNext: () => void;
  category?: string;
  onCategoryChange?: (category: string) => void;
  operatorMode?: "category" | "visit-info";
  onBack?: () => void;
}

const CATEGORIES = [
  {
    id: "VISITOR",
    labelKey: "cat_visitor",
    defaultLabel: "Visitor",
    icon: Users,
    activeBorder: "border-emerald-500 dark:border-emerald-400",
    activeBg: "bg-emerald-50/80 dark:bg-emerald-950/50",
    iconBg: "bg-emerald-500 text-white",
    checkBg: "bg-emerald-600 text-white",
  },
  {
    id: "VENDOR",
    labelKey: "cat_vendor",
    defaultLabel: "Vendor",
    icon: Briefcase,
    activeBorder: "border-purple-500 dark:border-purple-400",
    activeBg: "bg-purple-50/80 dark:bg-purple-950/50",
    iconBg: "bg-purple-600 text-white",
    checkBg: "bg-purple-600 text-white",
  },
  {
    id: "INTERVIEW",
    labelKey: "cat_interview",
    defaultLabel: "Interview",
    icon: UserCheck,
    activeBorder: "border-blue-500 dark:border-blue-400",
    activeBg: "bg-blue-50/80 dark:bg-blue-950/50",
    iconBg: "bg-blue-600 text-white",
    checkBg: "bg-blue-600 text-white",
  },
  {
    id: "SPECIAL_GUEST",
    labelKey: "cat_special_guest",
    defaultLabel: "Special Guest",
    icon: Award,
    activeBorder: "border-amber-500 dark:border-amber-400",
    activeBg: "bg-amber-50/80 dark:bg-amber-950/50",
    iconBg: "bg-amber-500 text-white",
    checkBg: "bg-amber-600 text-white",
  },
  {
    id: "CONTRACTOR",
    labelKey: "cat_contractor",
    defaultLabel: "Contractor",
    icon: HardHat,
    activeBorder: "border-orange-500 dark:border-orange-400",
    activeBg: "bg-orange-50/80 dark:bg-orange-950/50",
    iconBg: "bg-orange-500 text-white",
    checkBg: "bg-orange-600 text-white",
  },
  {
    id: "DELIVERY",
    labelKey: "cat_delivery",
    defaultLabel: "Delivery",
    icon: Truck,
    activeBorder: "border-teal-500 dark:border-teal-400",
    activeBg: "bg-teal-50/80 dark:bg-teal-950/50",
    iconBg: "bg-teal-600 text-white",
    checkBg: "bg-teal-600 text-white",
  },
];

// Existing department options from project visits & placeholders
const BASE_DEPARTMENTS = [
  { value: "Accounts", labelKey: "dept_accounts" },
  { value: "Production", labelKey: "dept_production" },
  { value: "IT", labelKey: "dept_it" },
  { value: "Admin", labelKey: "dept_admin" },
  { value: "Operations", labelKey: "dept_operations" },
  { value: "Procurement", labelKey: "dept_procurement" },
];

export default function VisitInfoStep({
  data,
  onChange,
  onNext,
  category = "VISITOR",
  onCategoryChange,
  operatorMode = "category",
  onBack,
}: VisitInfoStepProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { language, t } = useLanguage();
  const isUr = !isAdmin && language === "ur";

  const isAdvancingRef = useRef(false);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [recentHosts, setRecentHosts] = useState<string[]>([]);
  const [recentDepartments, setRecentDepartments] = useState<string[]>([]);

  useEffect(() => {
    isAdvancingRef.current = false;
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, [operatorMode]);

  // Fetch existing hosts and departments from recent visits in the database
  useEffect(() => {
    if (isAdmin) return;
    let cancelled = false;
    fetch("/api/visitors?limit=60")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json?.visits || !Array.isArray(json.visits)) return;
        const hostSet = new Set<string>();
        const deptSet = new Set<string>();
        const hosts: string[] = [];
        const depts: string[] = [];

        for (const v of json.visits) {
          const h = (v.hostName || "").trim();
          if (h && h.length >= 2) {
            const key = h.toLowerCase();
            if (!hostSet.has(key)) {
              hostSet.add(key);
              hosts.push(h);
            }
          }
          const d = (v.department || "").trim();
          if (d && d.length >= 2) {
            const key = d.toLowerCase();
            if (!deptSet.has(key)) {
              deptSet.add(key);
              depts.push(d);
            }
          }
        }
        setRecentHosts(hosts.slice(0, 8));
        setRecentDepartments(depts);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  // Build up to 6 department options combining existing database departments and standard facility departments
  const departmentOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: { value: string; labelKey?: string }[] = [];

    for (const base of BASE_DEPARTMENTS) {
      seen.add(base.value.toLowerCase());
      list.push(base);
    }

    for (const d of recentDepartments) {
      const lower = d.toLowerCase();
      if (!seen.has(lower) && list.length < 6) {
        seen.add(lower);
        list.push({ value: d });
      }
    }

    return list.slice(0, 6);
  }, [recentDepartments]);

  // Filter host suggestions based on current meetName input
  const filteredHosts = useMemo(() => {
    const q = data.meetName.trim().toLowerCase();
    if (!q) return recentHosts.slice(0, 4);
    return recentHosts
      .filter((h) => h.toLowerCase().includes(q))
      .slice(0, 4);
  }, [recentHosts, data.meetName]);

  const isMeetNameValid = data.meetName.trim().length > 0;
  const isDepartmentValid = data.department.trim().length > 0;
  const isFormValid = isMeetNameValid && isDepartmentValid;

  const triggerSafeNext = () => {
    if (isAdvancingRef.current) return;
    isAdvancingRef.current = true;
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    onNext();
  };

  const handleAdminChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
  };

  /* ================= ORIGINAL ADMIN VISIT INFO STEP (100% UNCHANGED) ================= */
  if (isAdmin) {
    const labelClass = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5";
    const inputClass =
      "block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors shadow-2xs";

    return (
      <div className="space-y-6">
        <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-6 sm:p-7">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Visit Information
            </h2>
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
                onChange={handleAdminChange}
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
                onChange={handleAdminChange}
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

  /* ================= OPERATOR STEP 1: SELECT VISITOR CATEGORY ================= */
  const textAlignClass = isUr ? "text-right" : "text-left";

  if (operatorMode === "category") {
    const handleCategorySelect = (catId: string) => {
      if (isAdvancingRef.current) return;
      if (onCategoryChange) {
        onCategoryChange(catId);
      }
      triggerSafeNext();
    };

    return (
      <div className="space-y-3">
        <div className={textAlignClass}>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t("select_category_title", "Select Visitor Category")}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t("select_category_subtitle", "Tap a category card to continue automatically")}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat.id)}
                aria-pressed={isSelected}
                className={`relative p-3 sm:p-4 rounded-2xl border-2 transition-all duration-150 flex flex-col items-center justify-center text-center gap-2 cursor-pointer min-h-[104px] sm:min-h-[120px] active:scale-[0.98] ${
                  isSelected
                    ? `${cat.activeBorder} ${cat.activeBg} shadow-sm`
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-800/70"
                }`}
              >
                {isSelected && (
                  <span
                    className={`absolute top-2 right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shadow-xs ${cat.checkBg}`}
                  >
                    <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />
                  </span>
                )}

                <div
                  className={`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center shadow-sm shrink-0 transition-transform ${
                    isSelected
                      ? `${cat.iconBg} scale-105`
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>

                <span
                  className={`text-xs sm:text-sm font-extrabold leading-snug ${
                    isSelected
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {t(cat.labelKey, cat.defaultLabel)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ================= OPERATOR STEP 2: VISIT INFORMATION ================= */
  const handleMeetNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextMeetName = e.target.value;
    const updated = { ...data, meetName: nextMeetName };
    onChange(updated);

    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }

    // If Department is already selected and operator finishes typing a valid host name, auto-advance after brief pause
    if (nextMeetName.trim().length >= 2 && updated.department.trim().length > 0) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        triggerSafeNext();
      }, 950);
    }
  };

  const handleSelectHostChip = (host: string) => {
    const updated = { ...data, meetName: host };
    onChange(updated);
    if (host.trim().length > 0 && updated.department.trim().length > 0) {
      triggerSafeNext();
    }
  };

  const handleSelectDepartmentCard = (deptValue: string) => {
    const updated = { ...data, department: deptValue };
    onChange(updated);
    if (updated.meetName.trim().length > 0 && deptValue.trim().length > 0) {
      triggerSafeNext();
    }
  };

  const handleCustomDepartmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextDept = e.target.value;
    const updated = { ...data, department: nextDept };
    onChange(updated);

    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }

    if (updated.meetName.trim().length > 0 && nextDept.trim().length >= 2) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        triggerSafeNext();
      }, 950);
    }
  };

  const handleFieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (data.meetName.trim().length > 0 && data.department.trim().length > 0) {
        triggerSafeNext();
      }
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Heading */}
      <div className={textAlignClass}>
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t("visit_info_title", "Visit Information")}
        </h2>
      </div>

      {/* 1. Visitor to Meet */}
      <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 space-y-2.5">
        <label
          htmlFor="meetName"
          className={`block text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 ${textAlignClass}`}
        >
          {t("meet_name_label", "Visitor to Meet")} <span className="text-red-500">*</span>
        </label>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="meetName"
            name="meetName"
            type="text"
            value={data.meetName}
            onChange={handleMeetNameInputChange}
            onKeyDown={handleFieldKeyDown}
            placeholder={t("meet_name_placeholder", "Search or enter host name (e.g. Muhammad Asif)")}
            className={`block w-full rounded-xl border-2 pl-10 pr-3.5 py-2.5 text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-900 focus:outline-none transition-colors ${textAlignClass} ${
              isMeetNameValid
                ? "border-emerald-500/80 dark:border-emerald-500/70"
                : "border-slate-200 dark:border-slate-700 focus:border-blue-500"
            }`}
          />
        </div>

        {/* Quick-select existing hosts from recent visits */}
        {filteredHosts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {filteredHosts.map((host) => {
              const isSelectedHost =
                data.meetName.trim().toLowerCase() === host.toLowerCase();
              return (
                <button
                  key={host}
                  type="button"
                  onClick={() => handleSelectHostChip(host)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98] ${
                    isSelectedHost
                      ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                  }`}
                >
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-[180px]">{host}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Department (5–6 Compact Selectable Cards/Buttons) */}
      <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 space-y-2.5">
        <label
          htmlFor="department"
          className={`block text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 ${textAlignClass}`}
        >
          {t("department_label", "Department")} <span className="text-red-500">*</span>
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {departmentOptions.map((dept) => {
            const isSelectedDept =
              data.department.trim().toLowerCase() === dept.value.toLowerCase();
            return (
              <button
                key={dept.value}
                type="button"
                onClick={() => handleSelectDepartmentCard(dept.value)}
                aria-pressed={isSelectedDept}
                className={`relative px-3 py-2.5 rounded-xl border-2 text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 text-center cursor-pointer min-h-[46px] active:scale-[0.98] ${
                  isSelectedDept
                    ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-blue-400 dark:hover:border-blue-500"
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {dept.labelKey ? t(dept.labelKey, dept.value) : dept.value}
                </span>
              </button>
            );
          })}
        </div>

        {/* Compact custom department input fallback */}
        <input
          id="department"
          name="department"
          type="text"
          value={data.department}
          onChange={handleCustomDepartmentChange}
          onKeyDown={handleFieldKeyDown}
          placeholder={t("department_placeholder", "Or type another department...")}
          className={`block w-full rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-900 focus:outline-none transition-colors ${textAlignClass} ${
            isDepartmentValid
              ? "border-emerald-500/80 dark:border-emerald-500/70"
              : "border-slate-200 dark:border-slate-700 focus:border-blue-500"
          }`}
        />
      </div>

      {/* Missing selection indicator */}
      {!isFormValid && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-amber-800 dark:text-amber-200 text-xs font-bold ${
            isUr ? "flex-row-reverse text-right" : "flex-row text-left"
          }`}
        >
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            {!isMeetNameValid
              ? t("missing_meet_name_hint", "Please enter or select Visitor to Meet")
              : t("missing_department_hint", "Please select a Department to continue")}
          </span>
        </div>
      )}

      {/* Back Navigation (No Next/Continue button on Step 2 per spec) */}
      <div className="flex items-center justify-between pt-1">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="py-2.5 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("back_btn", "Back")}</span>
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import {
  Users,
  Briefcase,
  UserCheck,
  Award,
  HardHat,
  Truck,
  Check,
  ArrowRight,
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

export default function VisitInfoStep({
  data,
  onChange,
  onNext,
  category = "VISITOR",
  onCategoryChange,
}: VisitInfoStepProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { language, t } = useLanguage();

  const isMeetNameValid = data.meetName.trim().length > 0;
  const isDepartmentValid = data.department.trim().length > 0;
  const isFormValid = isMeetNameValid && isDepartmentValid;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
  };

  if (isAdmin) {
    /* ================= ORIGINAL ADMIN VISIT INFO STEP ================= */
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

  /* ================= OPERATOR VISIT INFO STEP (Visual Category Cards + Readable Fields) ================= */
  const textAlignClass = language === "ur" ? "text-right" : "text-left";
  const opLabelClass = `block text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 mb-2 ${textAlignClass}`;
  const opInputClass = `block w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3.5 text-sm sm:text-base font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors shadow-2xs ${textAlignClass}`;

  return (
    <div className="space-y-6">
      {/* 1. Visible Category Selection Cards */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 sm:p-6">
        <div className={`mb-4 ${textAlignClass}`}>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t("select_category_title", "Select Visitor Category")}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("select_category_subtitle", "Tap one card below to choose who is entering the facility")}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryChange && onCategoryChange(cat.id)}
                aria-pressed={isSelected}
                className={`relative p-3.5 sm:p-4 rounded-2xl border-2 transition-all duration-150 flex flex-col items-center justify-center text-center gap-2.5 cursor-pointer min-h-[115px] sm:min-h-[125px] active:scale-[0.98] ${
                  isSelected
                    ? `${cat.activeBorder} ${cat.activeBg} shadow-md`
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/60 dark:hover:bg-slate-800/70"
                }`}
              >
                {/* Selected Checkmark Indicator */}
                {isSelected && (
                  <span
                    className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center shadow-xs ${cat.checkBg}`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}

                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-sm shrink-0 transition-transform ${
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
      </section>

      {/* 2. Visit Information Fields */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 sm:p-6">
        <div className={`mb-5 ${textAlignClass}`}>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t("visit_info_title", "Visit Information")}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("visit_info_subtitle", "Enter the name of the host and department the visitor is meeting")}
          </p>
        </div>

        <div className="space-y-5">
          {/* 1. Visitor is here to meet */}
          <div>
            <label htmlFor="meetName" className={opLabelClass}>
              {t("meet_name_label", "Visitor is here to meet")} <span className="text-red-500">*</span>
            </label>
            <input
              id="meetName"
              name="meetName"
              type="text"
              value={data.meetName}
              onChange={handleChange}
              placeholder={t("meet_name_placeholder", "e.g. Muhammad Asif (Manager)")}
              className={opInputClass}
            />
          </div>

          {/* 2. Department */}
          <div>
            <label htmlFor="department" className={opLabelClass}>
              {t("department_label", "Department")} <span className="text-red-500">*</span>
            </label>
            <input
              id="department"
              name="department"
              type="text"
              value={data.department}
              onChange={handleChange}
              placeholder={t("department_placeholder", "e.g. Accounts, Production, IT")}
              className={opInputClass}
            />
          </div>
        </div>
      </section>

      {/* Next Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onNext}
          disabled={!isFormValid}
          className={`w-full py-4 px-6 rounded-2xl text-sm sm:text-base font-extrabold shadow-sm flex items-center justify-center gap-2.5 transition-all ${
            isFormValid
              ? "bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white cursor-pointer shadow-blue-600/20"
              : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed shadow-none"
          }`}
        >
          <span>{t("continue_to_doc_scan", "Continue to Document Verification")}</span>
          <ArrowRight className="w-5 h-5 shrink-0" />
        </button>
        {!isFormValid && (
          <p className="text-center text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-500 mt-2.5">
            {t("fill_required_fields_hint", "Please fill in both required fields to continue")}
          </p>
        )}
      </div>
    </div>
  );
}


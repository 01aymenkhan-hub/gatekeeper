"use client";

import React from "react";
import { DlsData } from "../types/dls";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

interface DlsFormProps {
  /** The current DLS form data (controlled by parent). */
  data: DlsData;
  /** Called whenever a field value changes. */
  onChange: (updated: DlsData) => void;
}

export default function DlsForm({ data, onChange }: DlsFormProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { language, t } = useLanguage();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
  };

  if (isAdmin) {
    /* ================= ORIGINAL ADMIN DLS FORM ================= */
    const labelClass = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5";
    const inputClass =
      "block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors shadow-2xs";

    return (
      <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Driving License Information
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified fields from Driving License Sindh (DLS)
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            8 DLS Fields
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {/* 1. License No. */}
          <div>
            <label htmlFor="licenseNumber" className={labelClass}>
              License No.
            </label>
            <input
              id="licenseNumber"
              name="licenseNumber"
              type="text"
              value={data.licenseNumber || ""}
              onChange={handleChange}
              placeholder="e.g. DL-123456"
              className={inputClass}
            />
          </div>

          {/* 2. Full Name */}
          <div>
            <label htmlFor="fullName" className={labelClass}>
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={data.fullName || ""}
              onChange={handleChange}
              placeholder="e.g. Ammar Ahmed"
              className={inputClass}
            />
          </div>

          {/* 3. Father / Husband Name */}
          <div>
            <label htmlFor="fatherHusbandName" className={labelClass}>
              Father / Husband Name
            </label>
            <input
              id="fatherHusbandName"
              name="fatherHusbandName"
              type="text"
              value={data.fatherHusbandName || ""}
              onChange={handleChange}
              placeholder="e.g. Zafar Ahmed"
              className={inputClass}
            />
          </div>

          {/* 4. Date of Birth */}
          <div>
            <label htmlFor="dateOfBirth" className={labelClass}>
              Date of Birth
            </label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="text"
              value={data.dateOfBirth || ""}
              onChange={handleChange}
              placeholder="e.g. 25-May-1986"
              className={inputClass}
            />
          </div>

          {/* 5. Category */}
          <div>
            <label htmlFor="category" className={labelClass}>
              Category
            </label>
            <input
              id="category"
              name="category"
              type="text"
              value={data.category || ""}
              onChange={handleChange}
              placeholder="e.g. M CYCLE, M CAR"
              className={inputClass}
            />
          </div>

          {/* 6. Issue Date */}
          <div>
            <label htmlFor="issueDate" className={labelClass}>
              Issue Date
            </label>
            <input
              id="issueDate"
              name="issueDate"
              type="text"
              value={data.issueDate || ""}
              onChange={handleChange}
              placeholder="e.g. 29-May-2013"
              className={inputClass}
            />
          </div>

          {/* 7. Valid Upto */}
          <div>
            <label htmlFor="validUpto" className={labelClass}>
              Valid Upto
            </label>
            <input
              id="validUpto"
              name="validUpto"
              type="text"
              value={data.validUpto || ""}
              onChange={handleChange}
              placeholder="e.g. 27-May-2028"
              className={inputClass}
            />
          </div>

          {/* 8. Licensing Authority */}
          <div className="md:col-span-2">
            <label htmlFor="licensingAuthority" className={labelClass}>
              Licensing Authority
            </label>
            <input
              id="licensingAuthority"
              name="licensingAuthority"
              type="text"
              value={data.licensingAuthority || ""}
              onChange={handleChange}
              placeholder="e.g. DSP Munir Ahmed Awan, DL Saudabad Karachi"
              className={inputClass}
            />
          </div>
        </div>
      </section>
    );
  }

  /* ================= OPERATOR DLS FORM (Bilingual & Readable) ================= */
  const textAlignClass = language === "ur" ? "text-right" : "text-left";
  const opLabelClass = `block text-sm font-bold text-slate-800 dark:text-slate-100 mb-1.5 ${textAlignClass}`;
  const opInputClass =
    "block w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-3 text-sm sm:text-base font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors shadow-2xs";

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border-2 border-blue-500/30 dark:border-blue-800/60 p-4 sm:p-6">
      <div className={`mb-5 ${textAlignClass}`}>
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t("extracted_dls_title", "Driving Licence Information")}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {t("extracted_dls_subtitle", "Verify or edit the extracted details below before continuing")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
        {/* 1. License No. */}
        <div>
          <label htmlFor="licenseNumber" className={opLabelClass}>
            {t("field_license_no", "Licence Number")} <span className="text-red-500">*</span>
          </label>
          <input
            id="licenseNumber"
            name="licenseNumber"
            type="text"
            value={data.licenseNumber || ""}
            onChange={handleChange}
            placeholder="e.g. DL-123456"
            className={`${opInputClass} font-mono`}
          />
        </div>

        {/* 2. Full Name */}
        <div>
          <label htmlFor="fullName" className={opLabelClass}>
            {t("field_full_name", "Full Name")} <span className="text-red-500">*</span>
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={data.fullName || ""}
            onChange={handleChange}
            placeholder="e.g. Ammar Ahmed"
            className={opInputClass}
          />
        </div>

        {/* 3. Father / Husband Name */}
        <div>
          <label htmlFor="fatherHusbandName" className={opLabelClass}>
            {t("field_father_husband_name", "Father / Husband Name")}
          </label>
          <input
            id="fatherHusbandName"
            name="fatherHusbandName"
            type="text"
            value={data.fatherHusbandName || ""}
            onChange={handleChange}
            placeholder="e.g. Zafar Ahmed"
            className={opInputClass}
          />
        </div>

        {/* 4. Date of Birth */}
        <div>
          <label htmlFor="dateOfBirth" className={opLabelClass}>
            {t("field_dob", "Date of Birth")}
          </label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="text"
            value={data.dateOfBirth || ""}
            onChange={handleChange}
            placeholder="e.g. 25-May-1986"
            className={opInputClass}
          />
        </div>

        {/* 5. Category */}
        <div>
          <label htmlFor="category" className={opLabelClass}>
            {t("field_license_category", "Vehicle Category")}
          </label>
          <input
            id="category"
            name="category"
            type="text"
            value={data.category || ""}
            onChange={handleChange}
            placeholder="e.g. M CYCLE, M CAR"
            className={opInputClass}
          />
        </div>

        {/* 6. Issue Date */}
        <div>
          <label htmlFor="issueDate" className={opLabelClass}>
            {t("field_issue_date", "Date of Issue")}
          </label>
          <input
            id="issueDate"
            name="issueDate"
            type="text"
            value={data.issueDate || ""}
            onChange={handleChange}
            placeholder="e.g. 29-May-2013"
            className={opInputClass}
          />
        </div>

        {/* 7. Valid Upto */}
        <div>
          <label htmlFor="validUpto" className={opLabelClass}>
            {t("field_valid_upto", "Valid Upto")}
          </label>
          <input
            id="validUpto"
            name="validUpto"
            type="text"
            value={data.validUpto || ""}
            onChange={handleChange}
            placeholder="e.g. 27-May-2028"
            className={opInputClass}
          />
        </div>

        {/* 8. Licensing Authority */}
        <div className="md:col-span-2">
          <label htmlFor="licensingAuthority" className={opLabelClass}>
            {t("field_licensing_authority", "Licensing Authority")}
          </label>
          <input
            id="licensingAuthority"
            name="licensingAuthority"
            type="text"
            value={data.licensingAuthority || ""}
            onChange={handleChange}
            placeholder="e.g. DSP Munir Ahmed Awan, DL Saudabad Karachi"
            className={opInputClass}
          />
        </div>
      </div>
    </section>
  );
}


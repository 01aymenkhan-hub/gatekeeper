"use client";

import React from "react";
import { CnicData } from "../types/cnic";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

interface CnicFormProps {
  /** The current form data (controlled by parent). */
  data: CnicData;
  /** Called whenever a field value changes. */
  onChange: (updated: CnicData) => void;
}

export default function CnicForm({ data, onChange }: CnicFormProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { language, t } = useLanguage();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const updated: CnicData = { ...data, [name]: value };

    // Synchronize aliases
    if (name === "name" || name === "fullName") {
      updated.name = value;
      updated.fullName = value;
    } else if (name === "fatherName" || name === "fatherHusbandName") {
      updated.fatherName = value;
      updated.fatherHusbandName = value;
    } else if (name === "cnic" || name === "cnicNumber") {
      updated.cnic = value;
      updated.cnicNumber = value;
    }

    onChange(updated);
  };

  if (isAdmin) {
    /* ================= ORIGINAL ADMIN CNIC FORM ================= */
    const labelClass = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5";
    const inputClass =
      "block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors shadow-2xs";

    return (
      <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Extracted Information
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified fields from Pakistani CNIC (Smart Card or Old NADRA format)
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            8 Required Fields
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {/* 1. Full Name */}
          <div>
            <label htmlFor="fullName" className={labelClass}>
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={data.fullName || data.name || ""}
              onChange={handleChange}
              placeholder="e.g. Muhammad Mehmood Asim"
              className={inputClass}
            />
          </div>

          {/* 2. Father / Husband Name */}
          <div>
            <label htmlFor="fatherHusbandName" className={labelClass}>
              Father / Husband Name
            </label>
            <input
              id="fatherHusbandName"
              name="fatherHusbandName"
              type="text"
              value={data.fatherHusbandName || data.fatherName || ""}
              onChange={handleChange}
              placeholder="e.g. Muhammad Asim Khan"
              className={inputClass}
            />
          </div>

          {/* 3. CNIC Number */}
          <div>
            <label htmlFor="cnicNumber" className={labelClass}>
              CNIC Number
            </label>
            <input
              id="cnicNumber"
              name="cnicNumber"
              type="text"
              value={data.cnicNumber || data.cnic || ""}
              onChange={handleChange}
              placeholder="XXXXX-XXXXXXX-X"
              className={inputClass}
            />
          </div>

          {/* 4. Gender */}
          <div>
            <label htmlFor="gender" className={labelClass}>
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              value={data.gender || ""}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {/* 5. Date of Birth */}
          <div>
            <label htmlFor="dateOfBirth" className={labelClass}>
              Date of Birth
            </label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              value={data.dateOfBirth || ""}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          {/* 6. Date of Issue (empty for Old CNIC) */}
          <div>
            <label htmlFor="dateOfIssue" className={labelClass}>
              Date of Issue
            </label>
            <input
              id="dateOfIssue"
              name="dateOfIssue"
              type="date"
              value={data.dateOfIssue || ""}
              onChange={handleChange}
              placeholder="YYYY-MM-DD (Smart CNIC only)"
              className={inputClass}
            />
          </div>

          {/* 7. Date of Expiry (empty for Old CNIC) */}
          <div>
            <label htmlFor="dateOfExpiry" className={labelClass}>
              Date of Expiry
            </label>
            <input
              id="dateOfExpiry"
              name="dateOfExpiry"
              type="date"
              value={data.dateOfExpiry || ""}
              onChange={handleChange}
              placeholder="YYYY-MM-DD (Smart CNIC only)"
              className={inputClass}
            />
          </div>

          {/* 8. CNIC Identification (empty for Smart CNIC) */}
          <div>
            <label htmlFor="cnicIdentification" className={labelClass}>
              CNIC Identification
            </label>
            <input
              id="cnicIdentification"
              name="cnicIdentification"
              type="text"
              value={data.cnicIdentification || ""}
              onChange={handleChange}
              placeholder="e.g. Nothing / Mole on face"
              className={inputClass}
            />
          </div>
        </div>
      </section>
    );
  }

  /* ================= OPERATOR CNIC FORM (Bilingual & Readable) ================= */
  const textAlignClass = language === "ur" ? "text-right" : "text-left";
  const opLabelClass = `block text-sm font-bold text-slate-800 dark:text-slate-100 mb-1.5 ${textAlignClass}`;
  const opInputClass =
    "block w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-3 text-sm sm:text-base font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors shadow-2xs";

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border-2 border-emerald-500/30 dark:border-emerald-800/60 p-4 sm:p-6">
      <div className={`mb-5 ${textAlignClass}`}>
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t("extracted_cnic_title", "Extracted CNIC Information")}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {t("extracted_cnic_subtitle", "Verify or edit the extracted details below before continuing")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
        {/* 1. Full Name */}
        <div>
          <label htmlFor="fullName" className={opLabelClass}>
            {t("field_full_name", "Full Name")} <span className="text-red-500">*</span>
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={data.fullName || data.name || ""}
            onChange={handleChange}
            placeholder="e.g. Muhammad Mehmood Asim"
            className={opInputClass}
          />
        </div>

        {/* 2. Father / Husband Name */}
        <div>
          <label htmlFor="fatherHusbandName" className={opLabelClass}>
            {t("field_father_husband_name", "Father / Husband Name")}
          </label>
          <input
            id="fatherHusbandName"
            name="fatherHusbandName"
            type="text"
            value={data.fatherHusbandName || data.fatherName || ""}
            onChange={handleChange}
            placeholder="e.g. Muhammad Asim Khan"
            className={opInputClass}
          />
        </div>

        {/* 3. CNIC Number */}
        <div>
          <label htmlFor="cnicNumber" className={opLabelClass}>
            {t("field_cnic_number", "CNIC Number")} <span className="text-red-500">*</span>
          </label>
          <input
            id="cnicNumber"
            name="cnicNumber"
            type="text"
            value={data.cnicNumber || data.cnic || ""}
            onChange={handleChange}
            placeholder="XXXXX-XXXXXXX-X"
            className={`${opInputClass} font-mono`}
          />
        </div>

        {/* 4. Gender */}
        <div>
          <label htmlFor="gender" className={opLabelClass}>
            {t("field_gender", "Gender")}
          </label>
          <select
            id="gender"
            name="gender"
            value={data.gender || ""}
            onChange={handleChange}
            className={opInputClass}
          >
            <option value="">{t("field_gender_select", "Select Gender")}</option>
            <option value="Male">{t("field_gender_male", "Male")}</option>
            <option value="Female">{t("field_gender_female", "Female")}</option>
          </select>
        </div>

        {/* 5. Date of Birth */}
        <div>
          <label htmlFor="dateOfBirth" className={opLabelClass}>
            {t("field_dob", "Date of Birth")}
          </label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            value={data.dateOfBirth || ""}
            onChange={handleChange}
            className={opInputClass}
          />
        </div>

        {/* 6. Date of Issue */}
        <div>
          <label htmlFor="dateOfIssue" className={opLabelClass}>
            {t("field_issue_date", "Date of Issue")}
          </label>
          <input
            id="dateOfIssue"
            name="dateOfIssue"
            type="date"
            value={data.dateOfIssue || ""}
            onChange={handleChange}
            className={opInputClass}
          />
        </div>

        {/* 7. Date of Expiry */}
        <div>
          <label htmlFor="dateOfExpiry" className={opLabelClass}>
            {t("field_expiry_date", "Date of Expiry")}
          </label>
          <input
            id="dateOfExpiry"
            name="dateOfExpiry"
            type="date"
            value={data.dateOfExpiry || ""}
            onChange={handleChange}
            className={opInputClass}
          />
        </div>

        {/* 8. CNIC Identification */}
        <div>
          <label htmlFor="cnicIdentification" className={opLabelClass}>
            {t("field_identification", "Identification Mark")}
          </label>
          <input
            id="cnicIdentification"
            name="cnicIdentification"
            type="text"
            value={data.cnicIdentification || ""}
            onChange={handleChange}
            placeholder="e.g. Nothing"
            className={opInputClass}
          />
        </div>
      </div>
    </section>
  );
}


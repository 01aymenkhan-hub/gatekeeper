"use client";

import React from "react";
import { DlsData } from "../types/dls";

interface DlsFormProps {
  /** The current DLS form data (controlled by parent). */
  data: DlsData;
  /** Called whenever a field value changes. */
  onChange: (updated: DlsData) => void;
}

export default function DlsForm({ data, onChange }: DlsFormProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
  };

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

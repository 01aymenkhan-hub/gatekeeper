"use client";

import React, { useState, useRef } from "react";
import VisitorPhotoCameraModal from "./VisitorPhotoCameraModal";
import { VisitorStepData, SubmissionStatus, VisitInfoData } from "../types/visitor";
import { CnicData } from "../types/cnic";
import { DlsData, DocumentType } from "../types/dls";

interface VisitorStepProps {
  visitInfo: VisitInfoData;
  documentType: DocumentType;
  cnicData: CnicData;
  dlsData: DlsData;
  visitorData: VisitorStepData;
  onChangeVisitorData: (data: VisitorStepData) => void;
  onBack: () => void;
  onSubmit: () => Promise<void>;
  submissionStatus: SubmissionStatus;
  submissionError: string | null;
  onResetAll: () => void;
}

export default function VisitorStep({
  visitInfo,
  documentType,
  cnicData,
  dlsData,
  visitorData,
  onChangeVisitorData,
  onBack,
  onSubmit,
  submissionStatus,
  submissionError,
  onResetAll,
}: VisitorStepProps) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation rules:
  // 1. Photo must be present
  const isPhotoValid = Boolean(visitorData.photoPreview);
  // 2. Phone must be Pakistani format: 11 digits, starts with 03
  const isPhoneValid = /^03\d{9}$/.test(visitorData.phoneNumber.trim());
  // 3. Visitor Card No. must be non-empty
  const isCardNoValid = visitorData.visitorCardNo.trim().length > 0;

  // Complete step 3 form readiness
  const isFormReady = isPhotoValid && isPhoneValid && isCardNoValid;

  // Extract primary name & doc ID from Step 2 for summary
  const displayName =
    documentType === "cnic"
      ? cnicData.fullName || cnicData.name || "N/A"
      : dlsData.fullName || "N/A";

  const displayDocNum =
    documentType === "cnic"
      ? cnicData.cnicNumber || cnicData.cnic || "N/A"
      : dlsData.licenseNumber || "N/A";

  // Handle Photo captured from face camera
  const handlePhotoCaptured = (file: File, previewUrl: string) => {
    setIsCameraOpen(false);
    onChangeVisitorData({
      ...visitorData,
      photoFile: file,
      photoPreview: previewUrl,
    });
  };

  // Handle Photo uploaded from device
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    onChangeVisitorData({
      ...visitorData,
      photoFile: file,
      photoPreview: previewUrl,
    });
    e.target.value = "";
  };

  // Handle phone input: allow only digits, maximum 11 digits
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericOnly = e.target.value.replace(/\D/g, "").slice(0, 11);
    onChangeVisitorData({
      ...visitorData,
      phoneNumber: numericOnly,
    });
  };

  // Handle visitor card number change
  const handleCardNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeVisitorData({
      ...visitorData,
      visitorCardNo: e.target.value,
    });
  };

  const handleSubmitClick = async () => {
    if (!isFormReady || submissionStatus === "submitting" || submissionStatus === "success") {
      return;
    }
    await onSubmit();
  };

  return (
    <div className="space-y-6">
      {/* ── Summary Card: Host Info & Document Info ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
          {/* Host info from Step 1 */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Host / Meet To
            </span>
            <p className="font-bold text-slate-900 dark:text-white mt-0.5">
              {visitInfo.meetName || "N/A"}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              Dept: <span className="text-slate-700 dark:text-slate-300 font-medium">{visitInfo.department || "N/A"}</span>
            </p>
          </div>

          {/* Document info from Step 2 */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                {documentType === "cnic" ? "Pakistani CNIC" : "Driving License"}
              </span>
              <p className="font-bold text-slate-900 dark:text-white mt-0.5 truncate max-w-[170px]">{displayName}</p>
            </div>
            <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-lg">
              {displayDocNum}
            </span>
          </div>
        </div>
      </div>

      {/* ── Card Holder Photo Section ── */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Visitor Photo <span className="text-red-500">*</span>
            </h2>
            {isPhotoValid ? (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Photo Attached ✓
              </span>
            ) : (
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full">
                Required
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Capture or upload a clear portrait photo of the visitor
          </p>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Photo Box: Empty State vs Preview State */}
        {!visitorData.photoPreview ? (
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50/70 dark:bg-slate-800/40">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              No visitor photo attached
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-5 text-center max-w-xs">
              Take a photo using camera or upload from device
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              {/* Option 1: Capture Image */}
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
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
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>Capture Photo</span>
              </button>

              {/* Option 2: Upload Image */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <svg
                  className="w-4 h-4 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                <span>Upload Image</span>
              </button>
            </div>
          </div>
        ) : (
          /* Preview State */
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            {/* Image Preview */}
            <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-xl overflow-hidden shadow-xs border-2 border-white dark:border-slate-700 bg-slate-900 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={visitorData.photoPreview}
                alt="Visitor Photo"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Actions for Existing Photo */}
            <div className="flex-1 w-full space-y-2">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Visitor Photo Confirmed
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You can retake using camera or choose a different image.
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="py-2 px-3.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <svg
                    className="w-3.5 h-3.5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Retake Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2 px-3.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <svg
                    className="w-3.5 h-3.5 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  <span>Upload Different</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Phone Number Section ── */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="mb-3">
          <label
            htmlFor="visitorPhoneNumber"
            className="block text-base font-bold text-slate-900 dark:text-white tracking-tight"
          >
            Phone Number <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Format: 11-digit Pakistani mobile number starting with 03 (e.g. 03001234567)
          </p>
        </div>

        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
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
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </div>
          <input
            id="visitorPhoneNumber"
            type="tel"
            inputMode="numeric"
            pattern="03[0-9]{9}"
            maxLength={11}
            value={visitorData.phoneNumber}
            onChange={handlePhoneChange}
            placeholder="03001234567"
            className={`block w-full pl-10 pr-3 py-3 rounded-xl border text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 transition-colors shadow-2xs ${
              visitorData.phoneNumber.length > 0 && !isPhoneValid
                ? "border-red-400 focus:border-red-500 focus:ring-red-500/20 bg-red-50/20"
                : isPhoneValid
                ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                : "border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
            }`}
          />
        </div>

        {/* Validation warning */}
        {visitorData.phoneNumber.length > 0 && !isPhoneValid && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center space-x-1">
            <svg
              className="w-3.5 h-3.5 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>Please enter a valid Pakistani mobile number (03XXXXXXXXX).</span>
          </p>
        )}
      </section>

      {/* ── Visitor Card No. Section ── */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="mb-3">
          <label
            htmlFor="visitorCardNo"
            className="block text-base font-bold text-slate-900 dark:text-white tracking-tight"
          >
            Visitor Card Badge No. <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Enter the ID/number of the physical visitor card handed to the visitor
          </p>
        </div>

        <div className="max-w-md">
          <input
            id="visitorCardNo"
            type="text"
            value={visitorData.visitorCardNo}
            onChange={handleCardNoChange}
            placeholder="e.g. VC-1025 or 104"
            className="block w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500/20 transition-colors shadow-2xs"
          />
        </div>
      </section>

      {/* ── Belongings / Carried Items Section (Optional) ── */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Carrying Items / Belongings
              </h2>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md uppercase tracking-wider">
                Optional
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Is the visitor carrying bags, laptops, toolkits, or other equipment into the facility?
            </p>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(visitorData.hasBelongings)}
            onClick={() => {
              const nextState = !visitorData.hasBelongings;
              onChangeVisitorData({
                ...visitorData,
                hasBelongings: nextState,
                belongings: nextState ? (visitorData.belongings || '') : '',
              });
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              visitorData.hasBelongings ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                visitorData.hasBelongings ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Revealed only when toggle is ON */}
        {visitorData.hasBelongings && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in duration-200 space-y-2">
            <label
              htmlFor="carriedItemsInput"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              List Carried Items &amp; Serial Numbers
            </label>
            <textarea
              id="carriedItemsInput"
              rows={3}
              value={visitorData.belongings || ''}
              onChange={(e) =>
                onChangeVisitorData({
                  ...visitorData,
                  belongings: e.target.value,
                })
              }
              placeholder="e.g. Dell Latitude Laptop (SN: 884712), Black Backpack, Multimeter & Tool Kit"
              className="block w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500/20 transition-colors shadow-2xs"
            />
            <p className="text-[11px] text-slate-400">
              Items noted will be logged on the visitor entry record and shown in profile details.
            </p>
          </div>
        )}
      </section>

      {/* ── Submission Error Alert (if any) ── */}
      {submissionStatus === "error" && submissionError && (
        <div className="bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-xs sm:text-sm flex items-start space-x-2">
          <svg
            className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="font-semibold">Submission Failed</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{submissionError}</p>
          </div>
        </div>
      )}

      {/* ── Bottom Navigation & Submit Bar ── */}
      <div className="flex items-center justify-between gap-4 pt-2">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          disabled={submissionStatus === "submitting"}
          className="py-3 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50 shadow-2xs"
        >
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
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span>Back</span>
        </button>

        {/* 
          Stateful Submit Button:
          - Single icon only (no duplicate checkmark)
          - Idle: Submit Registration
          - Submitting: Submitting...
          - Success: Submitted
          - Error: Try Again
        */}
        <button
          type="button"
          onClick={handleSubmitClick}
          disabled={
            !isFormReady ||
            submissionStatus === "submitting" ||
            submissionStatus === "success"
          }
          className={`flex-1 max-w-xs py-3 px-6 rounded-xl text-white text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 ${
            submissionStatus === "submitting"
              ? "bg-blue-500 cursor-not-allowed"
              : submissionStatus === "success"
              ? "bg-emerald-600 cursor-default"
              : submissionStatus === "error"
              ? "bg-amber-600 hover:bg-amber-700 active:scale-[0.98] cursor-pointer"
              : isFormReady
              ? "bg-blue-600 hover:bg-blue-700 active:scale-[0.98] cursor-pointer"
              : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none border border-slate-200 dark:border-slate-700"
          }`}
        >
          {submissionStatus === "submitting" ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Submitting...</span>
            </>
          ) : submissionStatus === "success" ? (
            <>
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Submitted</span>
            </>
          ) : submissionStatus === "error" ? (
            <>
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Try Again</span>
            </>
          ) : (
            <span>Submit Registration</span>
          )}
        </button>
      </div>

      {/* Visitor Photo Camera Modal */}
      <VisitorPhotoCameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handlePhotoCaptured}
      />
    </div>
  );
}

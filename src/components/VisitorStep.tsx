"use client";

import React, { useState, useRef, useEffect } from "react";
import { Camera, RotateCcw, AlertTriangle, CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import VisitorPhotoCameraModal from "./VisitorPhotoCameraModal";
import { VisitorStepData, SubmissionStatus, VisitInfoData } from "../types/visitor";
import { CnicData } from "../types/cnic";
import { DlsData, DocumentType } from "../types/dls";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

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
}: VisitorStepProps) {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const isAdmin = user?.role === "ADMIN";
  const isUr = !isAdmin && language === "ur";

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live duplicate card availability check state
  const [cardAvailability, setCardAvailability] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [normalizedCardDisplay, setNormalizedCardDisplay] = useState<string>("");

  useEffect(() => {
    const raw = visitorData.visitorCardNo.trim();
    if (!raw) {
      setCardAvailability("idle");
      setNormalizedCardDisplay("");
      return;
    }

    let cancelled = false;
    setCardAvailability("checking");

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/visits/card-availability?cardNo=${encodeURIComponent(raw)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setNormalizedCardDisplay(data.normalizedCardNo || raw.toUpperCase());
          setCardAvailability(data.available ? "available" : "taken");
        } else {
          setCardAvailability("idle");
        }
      } catch {
        if (!cancelled) {
          setCardAvailability("idle");
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [visitorData.visitorCardNo]);

  // Validation rules:
  // 1. Photo must be present
  const isPhotoValid = Boolean(visitorData.photoPreview);
  // 2. Phone must be Pakistani format: 11 digits, starts with 03
  const isPhoneValid = /^03\d{9}$/.test(visitorData.phoneNumber.trim());
  // 3. Visitor Card No. must be non-empty and not currently assigned to an active visitor
  const isCardNoValid =
    visitorData.visitorCardNo.trim().length > 0 &&
    cardAvailability !== "taken" &&
    cardAvailability !== "checking";

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

  // Handle Photo uploaded from device (Admin only)
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

  // Handle visitor card number change (manual entry only)
  const handleCardNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeVisitorData({
      ...visitorData,
      visitorCardNo: e.target.value,
    });
  };

  const handleSubmitClick = async () => {
    if (
      !isFormReady ||
      submissionStatus === "submitting" ||
      submissionStatus === "success"
    ) {
      return;
    }
    await onSubmit();
  };

  /* ── Preserve Original Admin Panel UI 100% Unchanged ── */
  if (isAdmin) {
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
                Dept:{" "}
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {visitInfo.department || "N/A"}
                </span>
              </p>
            </div>

            {/* Document info from Step 2 */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  {documentType === "cnic" ? "Pakistani CNIC" : "Driving License"}
                </span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5 truncate max-w-[170px]">
                  {displayName}
                </p>
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
            {cardAvailability === "taken" && (
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mt-2">
                This card is already assigned. Please choose another available card.
              </p>
            )}
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

            <button
              type="button"
              role="switch"
              aria-checked={Boolean(visitorData.hasBelongings)}
              onClick={() => {
                const nextState = !visitorData.hasBelongings;
                onChangeVisitorData({
                  ...visitorData,
                  hasBelongings: nextState,
                  belongings: nextState ? visitorData.belongings || "" : "",
                });
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                visitorData.hasBelongings
                  ? "bg-blue-600"
                  : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  visitorData.hasBelongings ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

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
                value={visitorData.belongings || ""}
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
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                {submissionError}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 pt-2">
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
              <span>Submitting...</span>
            ) : submissionStatus === "success" ? (
              <span>Submitted</span>
            ) : submissionStatus === "error" ? (
              <span>Try Again</span>
            ) : (
              <span>Submit Registration</span>
            )}
          </button>
        </div>

        <VisitorPhotoCameraModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={handlePhotoCaptured}
        />
      </div>
    );
  }

  /* ── Operator Visual-First Step 3 UI ── */
  return (
    <div className="space-y-5">
      {/* ── Summary Card: Host Info & Document Info ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
          <div
            className={`bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/80 ${
              isUr ? "text-right" : "text-left"
            }`}
          >
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
              {t("host_summary_label")}
            </span>
            <p className="font-extrabold text-slate-900 dark:text-white mt-0.5 text-sm sm:text-base">
              {visitInfo.meetName || "N/A"}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 font-medium">
              {t("dept_label")}:{" "}
              <span className="text-slate-800 dark:text-slate-200 font-bold">
                {visitInfo.department || "N/A"}
              </span>
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2">
            <div className={isUr ? "text-right" : "text-left"}>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                {documentType === "cnic" ? t("cnic_title") : t("dls_title")}
              </span>
              <p className="font-extrabold text-slate-900 dark:text-white mt-0.5 truncate max-w-[170px] text-sm sm:text-base">
                {displayName}
              </p>
            </div>
            <span className="text-xs sm:text-sm font-mono font-extrabold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-lg shrink-0">
              {displayDocNum}
            </span>
          </div>
        </div>
      </div>

      {/* ── 1. Visitor Photo Capture Section (Large, Clear, Visual Action) ── */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className={isUr ? "text-right flex-1" : "text-left flex-1"}>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t("visitor_photo_title")} <span className="text-red-500">*</span>
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {t("capture_visitor_photo_sub")}
            </p>
          </div>

          {isPhotoValid ? (
            <span className="text-xs sm:text-sm font-bold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
              {t("photo_attached_badge")}
            </span>
          ) : (
            <span className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-full shrink-0">
              {t("photo_required_badge")}
            </span>
          )}
        </div>

        {/* Before Photo Capture vs After Photo Capture */}
        {!visitorData.photoPreview ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsCameraOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsCameraOpen(true);
              }
            }}
            className="group border-2 border-dashed border-blue-400 dark:border-blue-600 hover:border-blue-600 dark:hover:border-blue-400 rounded-2xl p-7 sm:p-9 flex flex-col items-center justify-center text-center bg-blue-50/50 hover:bg-blue-50/90 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 transition-all cursor-pointer active:scale-[0.99]"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-blue-100 dark:bg-blue-900/70 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-4 gk-pulse-blue transition-transform group-hover:scale-105">
              <Camera className="w-12 h-12 sm:w-14 sm:h-14 stroke-[2]" />
            </div>

            <p className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mb-1">
              {t("capture_visitor_photo")}
            </p>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mb-5 max-w-xs">
              {t("capture_visitor_photo_sub")}
            </p>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsCameraOpen(true);
              }}
              className="py-3.5 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm sm:text-base font-extrabold shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <Camera className="w-5 h-5" />
              <span>{t("capture_photo_btn")}</span>
            </button>
          </div>
        ) : (
          /* After Photo Capture: Clear Preview + Single Obvious Retake Photo Action */
          <div className="flex flex-col sm:flex-row items-center gap-5 p-5 bg-emerald-50/40 dark:bg-slate-800/60 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/70">
            <div className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-2xl overflow-hidden shadow-sm border-2 border-white dark:border-slate-700 bg-slate-900 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={visitorData.photoPreview}
                alt="Visitor Photo"
                className="w-full h-full object-cover"
              />
            </div>

            <div
              className={`flex-1 w-full space-y-3 ${
                isUr ? "text-right" : "text-left"
              }`}
            >
              <div
                className={`flex items-center gap-2 ${
                  isUr ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                  {t("photo_confirmed_title")}
                </span>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="py-3 px-5 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 shadow-2xs inline-flex items-center gap-2 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{t("retake_photo_btn")}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── 2. Phone Number Section ── */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className={`mb-3 ${isUr ? "text-right" : "text-left"}`}>
          <label
            htmlFor="visitorPhoneNumber"
            className="block text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight"
          >
            {t("phone_number_label")} <span className="text-red-500">*</span>
          </label>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {t("phone_number_hint")}
          </p>
        </div>

        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg
              className="w-5 h-5"
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
            className={`block w-full pl-11 pr-4 py-3.5 rounded-xl border text-base font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 transition-colors shadow-2xs ${
              visitorData.phoneNumber.length > 0 && !isPhoneValid
                ? "border-red-400 focus:border-red-500 focus:ring-red-500/20 bg-red-50/20"
                : isPhoneValid
                ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                : "border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
            }`}
          />
        </div>

        {visitorData.phoneNumber.length > 0 && !isPhoneValid && (
          <p
            className={`text-xs sm:text-sm font-bold text-red-600 dark:text-red-400 mt-2 flex items-center gap-1.5 ${
              isUr ? "flex-row-reverse text-right" : "flex-row text-left"
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{t("phone_number_error")}</span>
          </p>
        )}
      </section>

      {/* ── 3. Visitor Card Number Section (Manual Entry + Duplicate Active Card Prevention) ── */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className={`mb-3 ${isUr ? "text-right" : "text-left"}`}>
          <label
            htmlFor="visitorCardNo"
            className="block text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight"
          >
            {t("visitor_card_no_label")} <span className="text-red-500">*</span>
          </label>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {t("visitor_card_no_hint")}
          </p>
        </div>

        <div className="max-w-md space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <input
              id="visitorCardNo"
              type="text"
              value={visitorData.visitorCardNo}
              onChange={handleCardNoChange}
              placeholder={t("visitor_card_no_placeholder")}
              className={`block w-full pl-11 pr-10 py-3.5 rounded-xl border text-base font-mono font-extrabold uppercase text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 transition-colors shadow-2xs ${
                cardAvailability === "taken"
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 bg-red-50/30 dark:bg-red-950/20"
                  : cardAvailability === "available"
                  ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                  : "border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
              }`}
            />
            {cardAvailability === "checking" && (
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              </div>
            )}
          </div>

          {/* Prominent Duplicate Active Card Error Banner */}
          {cardAvailability === "taken" && (
            <div
              className={`p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border-2 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 flex items-center gap-3 animate-in fade-in duration-150 ${
                isUr ? "flex-row-reverse text-right" : "flex-row text-left"
              }`}
            >
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0" />
              <p className="text-sm sm:text-base font-extrabold leading-snug">
                {t("visitor_card_already_assigned")}
              </p>
            </div>
          )}

          {/* Clear Confirmation Badge of Entered Physical Card Number */}
          {cardAvailability === "available" && normalizedCardDisplay && (
            <div
              className={`p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between gap-3 ${
                isUr ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`flex items-center gap-2 ${
                  isUr ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-200">
                  {t("visitor_card_available_badge")}
                </span>
              </div>
              <span className="text-sm sm:text-base font-mono font-extrabold px-3 py-1 rounded-lg bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
                {normalizedCardDisplay}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── 4. Belongings / Carried Items Section (Optional) ── */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div
          className={`flex items-center justify-between gap-4 ${
            isUr ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <div className={isUr ? "text-right" : "text-left"}>
            <div
              className={`flex items-center gap-2 flex-wrap ${
                isUr ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                {t("carrying_items_title")}
              </h2>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                {t("optional_badge")}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {t("carrying_items_subtitle")}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={Boolean(visitorData.hasBelongings)}
            onClick={() => {
              const nextState = !visitorData.hasBelongings;
              onChangeVisitorData({
                ...visitorData,
                hasBelongings: nextState,
                belongings: nextState ? visitorData.belongings || "" : "",
              });
            }}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              visitorData.hasBelongings
                ? "bg-blue-600"
                : "bg-slate-300 dark:bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                visitorData.hasBelongings ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {visitorData.hasBelongings && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in duration-200 space-y-2">
            <label
              htmlFor="carriedItemsInput"
              className={`block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 ${
                isUr ? "text-right" : "text-left"
              }`}
            >
              {t("list_carried_items_label")}
            </label>
            <textarea
              id="carriedItemsInput"
              rows={3}
              value={visitorData.belongings || ""}
              onChange={(e) =>
                onChangeVisitorData({
                  ...visitorData,
                  belongings: e.target.value,
                })
              }
              placeholder={t("carried_items_placeholder")}
              className={`block w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-sm sm:text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500/20 transition-colors shadow-2xs ${
                isUr ? "text-right" : "text-left"
              }`}
            />
          </div>
        )}
      </section>

      {/* ── Submission Error Alert (if any) ── */}
      {submissionStatus === "error" && submissionError && (
        <div
          className={`bg-red-50 dark:bg-red-950/60 border-2 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3.5 rounded-xl text-sm flex items-center gap-3 ${
            isUr ? "flex-row-reverse text-right" : "flex-row text-left"
          }`}
        >
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0" />
          <p className="font-extrabold">{submissionError}</p>
        </div>
      )}

      {/* ── Bottom Navigation & Submit Bar ── */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={submissionStatus === "submitting"}
          className="py-3.5 px-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm sm:text-base font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-2xs"
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
          <span>{t("back_btn")}</span>
        </button>

        <button
          type="button"
          onClick={handleSubmitClick}
          disabled={
            !isFormReady ||
            submissionStatus === "submitting" ||
            submissionStatus === "success"
          }
          className={`flex-1 max-w-xs py-3.5 px-6 rounded-xl text-white text-sm sm:text-base font-extrabold shadow-xs transition-all flex items-center justify-center gap-2 ${
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
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span>{t("submitting_btn")}</span>
            </>
          ) : submissionStatus === "success" ? (
            <span>{t("submitted_btn")}</span>
          ) : submissionStatus === "error" ? (
            <span>{t("try_again_btn")}</span>
          ) : (
            <span>{t("submit_registration_btn")}</span>
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

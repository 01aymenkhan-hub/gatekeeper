"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { ScanStatus } from "../types/cnic";
import { DocumentType } from "../types/dls";
import CnicCameraModal from "./CnicCameraModal";

interface CnicScannerProps {
  /** Called when scanning should start with the selected or cropped file. */
  onScan: (file: File) => void;
  /** Current scanning status (controlled by the parent). */
  status: ScanStatus;
  /** Status message to display beneath the scanner area. */
  statusMessage: string;
  /** Selected document type (cnic or dls). */
  documentType?: DocumentType;
  /** Optional custom labels. */
  documentLabel?: string;
  uploadLabel?: string;
  captureLabel?: string;
  scanButtonLabel?: string;
  placeholderText?: string;
}

export default function CnicScanner({
  onScan,
  status,
  statusMessage,
  documentType = "cnic",
  documentLabel,
  uploadLabel,
  captureLabel,
  scanButtonLabel,
  placeholderText,
}: CnicScannerProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear preview and file when switching document types
  useEffect(() => {
    setPreview(null);
    setSelectedFile(null);
  }, [documentType]);

  const docLabel =
    documentLabel || (documentType === "dls" ? "Driving License" : "CNIC");
  const actualUploadLabel = uploadLabel || `Upload ${docLabel}`;
  const actualCaptureLabel = captureLabel || `Capture ${docLabel}`;
  const actualScanLabel = scanButtonLabel || `Scan ${docLabel}`;
  const actualPlaceholder =
    placeholderText || `Upload or capture a ${docLabel} image`;

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    },
    []
  );

  const handleUploadClick = () => fileInputRef.current?.click();
  const handleCameraClick = () => setIsCameraOpen(true);

  // Handle capture from the smart camera modal
  const handleCameraCapture = useCallback(
    (croppedFile: File) => {
      setIsCameraOpen(false);
      setSelectedFile(croppedFile);
      setPreview(URL.createObjectURL(croppedFile));
      // Auto-trigger scanning immediately for the seamless capture UX
      onScan(croppedFile);
    },
    [onScan]
  );

  const handleScan = () => {
    if (selectedFile) onScan(selectedFile);
  };

  const isScanning = status === "scanning";

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-6">
      {/* ── Camera Modal ── */}
      <CnicCameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
        documentTitle={docLabel}
      />

      {/* ── Image preview / placeholder ── */}
      <div className="mb-5 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 min-h-[220px] overflow-hidden">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={`${docLabel} preview`}
            className="max-h-[280px] object-contain rounded-lg p-2"
          />
        ) : (
          <div className="text-center py-10 px-4">
            <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 7h2l2-3h10l2 3h2a1 1 0 011 1v11a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1z"
                />
                <circle cx="12" cy="13" r="4" strokeWidth={1.5} />
              </svg>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm font-semibold">{actualPlaceholder}</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Supports Smart Card, Old NADRA CNIC, and Sindh Driving License</p>
          </div>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          type="button"
          onClick={handleUploadClick}
          disabled={isScanning}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
        >
          <svg
            className="h-4 w-4 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12"
            />
          </svg>
          {actualUploadLabel}
        </button>

        <button
          type="button"
          onClick={handleCameraClick}
          disabled={isScanning}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-4 py-2.5 text-xs sm:text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
        >
          <svg
            className="h-4 w-4 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7h2l2-3h10l2 3h2a1 1 0 011 1v11a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1z"
            />
            <circle cx="12" cy="13" r="4" strokeWidth={2} />
          </svg>
          {actualCaptureLabel}
        </button>
      </div>

      {/* ── Scan button ── */}
      <button
        type="button"
        onClick={handleScan}
        disabled={!selectedFile || isScanning}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
      >
        {isScanning ? (
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
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            <span>Processing Document OCR...</span>
          </>
        ) : (
          <span>{actualScanLabel}</span>
        )}
      </button>

      {/* ── Status message ── */}
      {status !== "idle" && (
        <div
          className={`mt-4 rounded-xl p-3 text-xs font-semibold ${
            status === "scanning"
              ? "bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
              : status === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
          }`}
        >
          {statusMessage}
        </div>
      )}
    </section>
  );
}

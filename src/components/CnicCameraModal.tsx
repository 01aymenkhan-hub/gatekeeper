"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

interface CnicCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  documentTitle?: string;
}

// Pakistani CNIC ID-1 Aspect Ratio (85.60mm x 53.98mm = ~1.5858)
const CNIC_ASPECT_RATIO = 85.6 / 53.98;

// Normalized output dimensions for cropped CNIC
const TARGET_WIDTH = 1000;
const TARGET_HEIGHT = Math.round(TARGET_WIDTH / CNIC_ASPECT_RATIO); // ~631px

export default function CnicCameraModal({
  isOpen,
  onClose,
  onCapture,
  documentTitle,
}: CnicCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const guideRef = useRef<HTMLDivElement>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"live" | "review">("live");
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [isShutterActive, setIsShutterActive] = useState(false);

  // Stop camera stream cleanly
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Initialize rear camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
        };
      }
    } catch (err: unknown) {
      console.error("Camera access error:", err);
      setCameraError(
        "Unable to access camera. Please check permissions or use Upload CNIC."
      );
    }
  }, []);

  // Open / Close lifecycle
  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      setCapturedPreview(null);
      setCapturedFile(null);
      setModalMode("live");
      return;
    }

    setModalMode("live");
    setCapturedPreview(null);
    setCapturedFile(null);
    startCamera();

    return () => {
      stopCameraStream();
    };
  }, [isOpen, startCamera, stopCameraStream]);

  // Capture current camera frame and crop strictly to guide rectangle
  const handleShutterClick = useCallback(() => {
    const video = videoRef.current;
    const guide = guideRef.current;
    if (!video || !guide || video.videoWidth === 0 || video.videoHeight === 0) return;

    // Trigger visual flash
    setIsShutterActive(true);
    setTimeout(() => setIsShutterActive(false), 150);

    try {
      const videoRect = video.getBoundingClientRect();
      const guideRect = guide.getBoundingClientRect();

      const scale = Math.max(
        videoRect.width / video.videoWidth,
        videoRect.height / video.videoHeight
      );

      const renderedW = video.videoWidth * scale;
      const renderedH = video.videoHeight * scale;

      const offsetX = (renderedW - videoRect.width) / 2;
      const offsetY = (renderedH - videoRect.height) / 2;

      const relX = guideRect.left - videoRect.left;
      const relY = guideRect.top - videoRect.top;

      let nativeX = (relX + offsetX) / scale;
      let nativeY = (relY + offsetY) / scale;
      let nativeW = guideRect.width / scale;
      let nativeH = guideRect.height / scale;

      nativeX = Math.max(0, Math.min(video.videoWidth, nativeX));
      nativeY = Math.max(0, Math.min(video.videoHeight, nativeY));
      nativeW = Math.min(video.videoWidth - nativeX, nativeW);
      nativeH = Math.min(video.videoHeight - nativeY, nativeH);

      // Render strictly the cropped inner CNIC area to high-res canvas
      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = TARGET_WIDTH;
      outputCanvas.height = TARGET_HEIGHT;
      const ctx = outputCanvas.getContext("2d");

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(
          video,
          nativeX,
          nativeY,
          nativeW,
          nativeH,
          0,
          0,
          TARGET_WIDTH,
          TARGET_HEIGHT
        );

        outputCanvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], "cnic_capture_cropped.jpg", {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              setCapturedFile(file);
              setCapturedPreview(URL.createObjectURL(file));
              // Switch to Review mode
              setModalMode("review");
            }
          },
          "image/jpeg",
          0.96
        );
      }
    } catch (err) {
      console.error("Capture cropping error:", err);
    }
  }, []);

  // User clicks "Cancel" on review screen: discard and return to camera
  const handleReviewCancel = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedPreview(null);
    setCapturedFile(null);
    setModalMode("live");
    // Ensure video stream continues playing
    if (videoRef.current && streamRef.current) {
      videoRef.current.play().catch(console.error);
    } else {
      startCamera();
    }
  };

  // User clicks "✓ Use Photo": confirm and send to OCR pipeline
  const handleReviewConfirm = () => {
    if (!capturedFile) return;
    stopCameraStream();
    onCapture(capturedFile);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-0 sm:p-4 select-none">
      {/* ── Main Modal Container ── */}
      <div className="relative w-full h-full sm:max-w-xl sm:h-[90vh] sm:rounded-2xl overflow-hidden bg-black flex flex-col justify-between">
        {/* Shutter Flash Animation Overlay */}
        {isShutterActive && (
          <div className="absolute inset-0 z-40 bg-white opacity-80 pointer-events-none transition-opacity" />
        )}

        {/* ── Top Header Bar ── */}
        <div className="relative z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-white text-sm font-semibold tracking-wide">
              {modalMode === "live"
                ? `Scan ${documentTitle || "CNIC (Front)"}`
                : `Review ${documentTitle || "CNIC"} Photo`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="rounded-full bg-white/20 hover:bg-white/30 p-2 text-white transition-colors"
            title="Close camera"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Middle Area: Live Camera View OR Review Preview ── */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
          {cameraError ? (
            <div className="text-center p-6 text-white max-w-sm">
              <svg className="mx-auto w-12 h-12 text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-red-200 mb-4">{cameraError}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold"
              >
                Close Camera
              </button>
            </div>
          ) : modalMode === "live" ? (
            /* 1. Live Camera Mode with CamScanner Guide */
            <>
              {/* Native Live Video Feed */}
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Darkened Mask around CNIC Guide */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
                {/* 
                  CNIC Guide Frame (Fixed Landscape Aspect Ratio ~1.586)
                  Fills ~90% of screen width up to max 480px
                */}
                <div
                  ref={guideRef}
                  className="relative w-[90%] max-w-[480px] aspect-[1.586/1] rounded-2xl ring-2 ring-white/90 shadow-2xl transition-all"
                  style={{
                    boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.65)",
                  }}
                >
                  {/* Corner Accent Brackets */}
                  <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-white rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-white rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-white rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-white rounded-br-xl" />

                  {/* Centered Guide Text */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-xs sm:text-sm font-medium text-white/90 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-xs">
                      {documentTitle ? `Place ${documentTitle} here` : "Place CNIC here"}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* 2. Review Screen (Showing Cropped CNIC Preview) */
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              <div className="relative w-[92%] max-w-[480px] aspect-[1.586/1] rounded-xl overflow-hidden border-2 border-white/50 shadow-2xl bg-black">
                {capturedPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={capturedPreview}
                    alt="Captured CNIC preview"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <p className="text-xs text-white/70 mt-3 text-center">
                Review your CNIC photo. Ensure text and details are clear.
              </p>
            </div>
          )}
        </div>

        {/* ── Bottom Controls Bar ── */}
        <div className="relative z-20 p-5 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col items-center">
          {modalMode === "live" ? (
            /* Live Camera Controls: Single Shutter Button */
            <div className="w-full flex items-center justify-center">
              <button
                type="button"
                onClick={handleShutterClick}
                disabled={Boolean(cameraError)}
                className="group relative flex items-center justify-center w-18 h-18 rounded-full border-4 border-white bg-white/20 active:scale-95 transition-transform shadow-lg cursor-pointer"
                title="Capture CNIC"
              >
                <div className="w-14 h-14 rounded-full bg-white group-hover:scale-95 group-active:scale-90 transition-transform shadow-inner" />
              </button>
            </div>
          ) : (
            /* Review Screen Controls: [ Cancel ] and [ ✓ Use Photo ] */
            <div className="w-full max-w-sm flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleReviewCancel}
                className="flex-1 py-3 px-4 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-sm font-semibold transition-all text-center"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReviewConfirm}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold transition-all shadow-lg text-center flex items-center justify-center space-x-1.5"
              >
                <span>✓ Use Photo</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, RefreshCw, AlertTriangle, FlipHorizontal, Loader2, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const OPERATOR_VIEWFINDER_ID = 'operator-qr-viewfinder-container';

interface ScannerInstance {
  stop: () => Promise<void>;
  clear: () => void | Promise<void>;
  isScanning?: boolean;
}

interface OperatorQrScannerProps {
  onScan: (decodedText: string) => void;
  onCancel: () => void;
  isVerifying?: boolean;
}

export default function OperatorQrScanner({
  onScan,
  onCancel,
  isVerifying = false,
}: OperatorQrScannerProps) {
  const { language, t } = useLanguage();
  const [permissionState, setPermissionState] = useState<'pending' | 'granted' | 'denied' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [scanSuccess, setScanSuccess] = useState(false);

  const scannerRef = useRef<ScannerInstance | null>(null);
  const isMountedRef = useRef(true);
  const isStartingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const hasScannedRef = useRef(false);
  const currentFacingModeRef = useRef<'environment' | 'user'>('environment');

  const stopScanner = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    const instance = scannerRef.current;
    if (instance) {
      try {
        if (instance.isScanning) {
          await instance.stop();
        }
        await instance.clear();
      } catch (err) {
        console.warn('[Operator QR] Teardown warning:', err);
      } finally {
        scannerRef.current = null;
      }
    }
    isStoppingRef.current = false;
  }, []);

  const handleSuccessfulScan = useCallback(
    async (decodedText: string) => {
      if (hasScannedRef.current) return;
      hasScannedRef.current = true;
      setScanSuccess(true);

      // Provide mobile haptic vibration feedback
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(100);
        } catch {}
      }

      await stopScanner();
      onScan(decodedText);
    },
    [onScan, stopScanner]
  );

  const startScanner = useCallback(
    async (cameraParam?: string | { facingMode: string }) => {
      if (!isMountedRef.current || isStartingRef.current) return;

      isStartingRef.current = true;
      setIsInitializing(true);
      setErrorMessage(null);
      hasScannedRef.current = false;
      setScanSuccess(false);

      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        if (!isMountedRef.current) {
          isStartingRef.current = false;
          return;
        }

        await stopScanner();

        if (!isMountedRef.current) {
          isStartingRef.current = false;
          return;
        }

        const containerEl = document.getElementById(OPERATOR_VIEWFINDER_ID);
        if (!containerEl) {
          isStartingRef.current = false;
          setIsInitializing(false);
          return;
        }

        const html5QrCode = new Html5Qrcode(OPERATOR_VIEWFINDER_ID);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edgeSize = Math.max(190, Math.floor(minEdge * 0.72));
            return { width: edgeSize, height: edgeSize };
          },
          aspectRatio: 1.0,
        };

        const targetCamera = cameraParam || { facingMode: currentFacingModeRef.current };

        await html5QrCode.start(
          targetCamera,
          config,
          (decodedText: string) => {
            handleSuccessfulScan(decodedText);
          },
          () => {}
        );

        if (!isMountedRef.current) {
          try {
            if (html5QrCode.isScanning) await html5QrCode.stop();
            await html5QrCode.clear();
          } catch {}
          scannerRef.current = null;
          isStartingRef.current = false;
          return;
        }

        setPermissionState('granted');
        setIsInitializing(false);

        // Safe background enumeration of cameras once stream is running
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0 && isMountedRef.current) {
            setCameras(devices);
          }
        } catch {}
      } catch (err: unknown) {
        console.error('[Operator QR Scanner] Init error:', err);
        if (isMountedRef.current) {
          const errStr = (err instanceof Error ? err.message : String(err)).toLowerCase();
          if (errStr.includes('permission') || errStr.includes('notallowed')) {
            setPermissionState('denied');
            setErrorMessage('Camera access denied. Please enable camera permission in your mobile browser.');
          } else {
            setPermissionState('error');
            setErrorMessage(
              err instanceof Error
                ? err.message
                : 'Camera is currently unavailable. Ensure no other app is using it.'
            );
          }
          setIsInitializing(false);
        }
      } finally {
        isStartingRef.current = false;
      }
    },
    [handleSuccessfulScan, stopScanner]
  );

  useEffect(() => {
    isMountedRef.current = true;
    const timer = setTimeout(() => {
      void startScanner();
    }, 0);

    return () => {
      clearTimeout(timer);
      isMountedRef.current = false;
      void stopScanner();
    };
  }, [startScanner, stopScanner]);

  const switchCamera = async () => {
    if (isStartingRef.current || isInitializing) return;

    if (cameras.length > 1) {
      let nextCameraId: string | null = null;
      if (activeCameraId) {
        const currentIndex = cameras.findIndex((c) => c.id === activeCameraId);
        const nextIndex = (currentIndex + 1) % cameras.length;
        nextCameraId = cameras[nextIndex].id;
      } else {
        const frontCam = cameras.find((c) =>
          c.label.toLowerCase().includes('front') || c.label.toLowerCase().includes('user')
        );
        nextCameraId = frontCam ? frontCam.id : (cameras[1]?.id || cameras[0].id);
      }
      setActiveCameraId(nextCameraId);
      await startScanner(nextCameraId);
    } else {
      const newMode = currentFacingModeRef.current === 'environment' ? 'user' : 'environment';
      currentFacingModeRef.current = newMode;
      setActiveCameraId(null);
      await startScanner({ facingMode: newMode });
    }
  };

  const handleRetry = () => {
    setActiveCameraId(null);
    currentFacingModeRef.current = 'environment';
    void startScanner({ facingMode: 'environment' });
  };

  const localizedCameraError =
    permissionState === 'denied'
      ? t('camera_permission_denied')
      : language === 'ur'
      ? t('camera_unavailable')
      : errorMessage || t('camera_unavailable');

  return (
    <div className="flex flex-col items-center justify-center w-full animate-in fade-in duration-200">
      {/* Viewfinder Window */}
      <div className="relative w-full max-w-[340px] aspect-square rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-700 dark:border-slate-800 shadow-2xl flex items-center justify-center">
        <div id={OPERATOR_VIEWFINDER_ID} className="w-full h-full object-cover" />

        {/* Loading Overlay */}
        {isInitializing && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center text-white text-center gap-3 z-20 p-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
            <p className="text-xs font-bold tracking-wide text-slate-200">
              {t('starting_camera', 'Starting Camera...')}
            </p>
          </div>
        )}

        {/* Verifying Operator State */}
        {(isVerifying || scanSuccess) && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-white text-center gap-3 z-30 p-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-pulse" />
            </div>
            <p className="text-sm font-black tracking-wide text-emerald-300">
              {t('qr_code_detected', 'QR Code Detected')}
            </p>
            <p className="text-xs text-slate-300">
              {t('verifying_credentials', 'Verifying Operator Credentials...')}
            </p>
          </div>
        )}

        {/* Camera Error State */}
        {(permissionState === 'denied' || permissionState === 'error') && !isInitializing && (
          <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center z-20 space-y-4">
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                {t('camera_access_error', 'Camera Access Error')}
              </h4>
              <p className="text-xs text-slate-300 mt-1.5 max-w-[240px] leading-relaxed">
                {localizedCameraError}
              </p>
            </div>
            <button
              onClick={handleRetry}
              type="button"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('retry_camera', 'Retry Camera')}</span>
            </button>
          </div>
        )}

        {/* Active Scanning Target Reticle */}
        {permissionState === 'granted' && !isInitializing && !scanSuccess && !isVerifying && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
            <div className="w-52 h-52 sm:w-60 sm:h-60 relative rounded-2xl border-2 border-dashed border-blue-400/70 bg-blue-500/5">
              {/* Corner Indicators */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />

              {/* Laser Scanning Beam */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent absolute top-1/2 -translate-y-1/2 shadow-[0_0_15px_rgba(59,130,246,1)] animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {/* Helper text & Scanner Controls */}
      <div className="mt-4 text-center space-y-3 w-full max-w-[340px]">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {t('position_qr_in_frame', 'Position your Operator QR Card in the center frame')}
        </p>

        <div className="flex items-center justify-center gap-2.5">
          {cameras.length > 1 && (
            <button
              onClick={switchCamera}
              type="button"
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <FlipHorizontal className="w-3.5 h-3.5 text-blue-500" />
              <span>{t('flip_camera', 'Flip Camera')}</span>
            </button>
          )}

          <button
            onClick={() => {
              void stopScanner();
              onCancel();
            }}
            type="button"
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
            <span>{t('cancel_scan', 'Cancel Scan')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

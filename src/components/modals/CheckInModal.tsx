'use client';

import React, { useState, useCallback } from 'react';
import {
  X,
  AlertTriangle,
  Camera,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import VisitInfoStep from '../VisitInfoStep';
import CnicScanner from '../CnicScanner';
import CnicCameraModal from '../CnicCameraModal';
import CnicForm from '../CnicForm';
import DlsForm from '../DlsForm';
import VisitorStep from '../VisitorStep';
import VisitorBadgeModal from './VisitorBadgeModal';
import RegistrationSuccessModal from './RegistrationSuccessModal';
import GatekeeperLoader from '../ui/GatekeeperLoader';
import { CnicData, ScanStatus } from '../../types/cnic';
import { DlsData, DocumentType } from '../../types/dls';
import { VisitInfoData, VisitorStepData, SubmissionStatus } from '../../types/visitor';
import { scanCnicReal, scanCnicMock, RawOcrResponse } from '../../services/cnicApi';
import { scanDlsReal, scanDlsMock, RawDlsResponse } from '../../services/dlsApi';
import { parseCnicOcr } from '../../utils/cnicParser';
import { compressIdentityImageFile } from '../../utils/documentImageCompression';
import {
  playSelectSound,
  playContinueSound,
  playBackSound,
  playRegistrationSuccessSound,
} from '../../utils/interactionSound';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { IconPakistaniCnic, IconDrivingLicence } from '../icons/OperatorTaskIcons';

const EMPTY_VISIT_INFO: VisitInfoData = {
  meetName: '',
  department: '',
  departmentId: '',
};

const EMPTY_CNIC_DATA: CnicData = {
  name: '',
  fatherName: '',
  gender: '',
  countryOfStay: '',
  cnic: '',
  dateOfBirth: '',
  dateOfIssue: '',
  dateOfExpiry: '',
  cnicIdentification: '',
  fullName: '',
  fatherHusbandName: '',
  cnicNumber: '',
};

const EMPTY_DLS_DATA: DlsData = {
  licenseNumber: '',
  fullName: '',
  fatherHusbandName: '',
  dateOfBirth: '',
  category: '',
  issueDate: '',
  validUpto: '',
  licensingAuthority: '',
};

const EMPTY_VISITOR_DATA: VisitorStepData = {
  photoPreview: null,
  photoFile: null,
  phoneNumber: '',
  visitorCardNo: '',
  hasBelongings: false,
  belongings: '',
};

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
  onSuccess?: () => void;
}

export default function CheckInModal({
  isOpen,
  onClose,
  defaultCategory = 'VISITOR',
  onSuccess,
}: CheckInModalProps) {
  const { user, currentGate } = useAuth();
  const { language, t } = useLanguage();
  const isAdmin = user?.role === 'ADMIN';
  const isUr = !isAdmin && language === 'ur';

  // Admin 3-step state (unchanged)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  // Operator 6-step state (1: Category, 2: Visit Info, 3: Scan ID Card, 4: Review Scanned Details, 5: Capture Photo, 6: Registration Details)
  const [operatorStep, setOperatorStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  const [category, setCategory] = useState<string>(() =>
    isAdmin ? defaultCategory || 'VISITOR' : ''
  );
  const [prevDefaultCategory, setPrevDefaultCategory] = useState<string>(defaultCategory);
  if (defaultCategory !== prevDefaultCategory) {
    setPrevDefaultCategory(defaultCategory);
    if (isAdmin) {
      setCategory(defaultCategory || 'VISITOR');
    }
  }
  const [prevIsOpen, setPrevIsOpen] = useState<boolean>(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen && !isAdmin) {
      setCategory('');
      setOperatorStep(1);
    }
  }

  const [visitInfo, setVisitInfo] = useState<VisitInfoData>(EMPTY_VISIT_INFO);
  const [documentType, setDocumentType] = useState<DocumentType>('cnic');
  const [isDocCameraOpen, setIsDocCameraOpen] = useState(false);

  // CNIC Form State & Scanned Image State
  const [cnicFormData, setCnicFormData] = useState<CnicData>(EMPTY_CNIC_DATA);
  const [cnicScanStatus, setCnicScanStatus] = useState<ScanStatus>('idle');
  const [, setRawCnicOcrResult] = useState<RawOcrResponse | null>(null);
  const [cnicScannedImage, setCnicScannedImage] = useState<string | null>(null);
  const [cnicImageCaptureError, setCnicImageCaptureError] = useState<string | null>(null);

  // DLS Form State & Scanned Image State
  const [dlsFormData, setDlsFormData] = useState<DlsData>(EMPTY_DLS_DATA);
  const [dlsScanStatus, setDlsScanStatus] = useState<ScanStatus>('idle');
  const [, setRawDlsOcrResult] = useState<RawDlsResponse | null>(null);
  const [dlsScannedImage, setDlsScannedImage] = useState<string | null>(null);
  const [dlsImageCaptureError, setDlsImageCaptureError] = useState<string | null>(null);

  // Visitor Data & Submission State
  const [visitorData, setVisitorData] = useState<VisitorStepData>(EMPTY_VISITOR_DATA);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [createdVisit, setCreatedVisit] = useState<Record<string, unknown> | null>(null);
  const [imageStorageStatus, setImageStorageStatus] = useState<'saved' | 'failed' | 'none'>('none');
  const [imageStorageError, setImageStorageError] = useState<string | null>(null);
  const [isRetryingImageSave, setIsRetryingImageSave] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [autoPrintBadge, setAutoPrintBadge] = useState(false);

  const getCnicStatusMessage = (status: ScanStatus): string => {
    switch (status) {
      case 'scanning':
        return 'Analyzing CNIC with OCR...';
      case 'success':
        return 'CNIC scanned successfully! Fields populated.';
      case 'error':
        return 'Unable to read CNIC. Ensure Python OCR service is running on port 8000.';
      default:
        return '';
    }
  };

  const getDlsStatusMessage = (status: ScanStatus): string => {
    switch (status) {
      case 'scanning':
        return 'Analyzing Driving License with OCR...';
      case 'success':
        return 'Driving License scanned successfully! Fields populated.';
      case 'error':
        return 'Unable to read Driving License. Ensure Python OCR service is running on port 8000.';
      default:
        return '';
    }
  };

  const handleCnicScan = useCallback(
    async (file: File) => {
      setCnicScanStatus('scanning');
      setCnicImageCaptureError(null);

      // Compress and retain the scanned CNIC image in parallel with OCR processing
      const compressionPromise = compressIdentityImageFile(file);

      try {
        const [result, compressedImg] = await Promise.all([
          scanCnicReal(file),
          compressionPromise,
        ]);

        if (compressedImg.ok) {
          setCnicScannedImage(compressedImg.dataUrl);
        } else {
          setCnicScannedImage(null);
          setCnicImageCaptureError(compressedImg.error);
        }

        setRawCnicOcrResult(result);
        const rawItems = result.results || result.details || [];
        const structuredData: CnicData = result.parsed || parseCnicOcr(rawItems);

        structuredData.name = structuredData.name || structuredData.fullName || '';
        structuredData.fullName = structuredData.name;
        structuredData.fatherName =
          structuredData.fatherName || structuredData.fatherHusbandName || '';
        structuredData.fatherHusbandName = structuredData.fatherName;
        structuredData.cnic = structuredData.cnic || structuredData.cnicNumber || '';
        structuredData.cnicNumber = structuredData.cnic;
        structuredData.cnicIdentification = structuredData.cnicIdentification || '';

        const hasExtractedData = Boolean(
          structuredData.cnicNumber?.trim() || structuredData.fullName?.trim()
        );

        if (!isAdmin && !hasExtractedData) {
          setCnicScanStatus('error');
          return;
        }

        setCnicFormData(structuredData);
        setCnicScanStatus('success');
        if (!isAdmin) {
          playContinueSound();
          setOperatorStep(4);
        }
      } catch {
        const compressedImg = await compressionPromise;
        if (compressedImg.ok) {
          setCnicScannedImage(compressedImg.dataUrl);
        } else {
          setCnicScannedImage(null);
          setCnicImageCaptureError(compressedImg.error);
        }

        if (isAdmin) {
          try {
            const mockResult = await scanCnicMock(file);
            setCnicFormData(mockResult);
            setCnicScanStatus('success');
          } catch {
            setCnicScanStatus('error');
          }
        } else {
          setCnicScanStatus('error');
        }
      }
    },
    [isAdmin]
  );

  const handleDlsScan = useCallback(
    async (file: File) => {
      setDlsScanStatus('scanning');
      setDlsImageCaptureError(null);

      // Compress and retain the scanned DLS image in parallel with OCR processing
      const compressionPromise = compressIdentityImageFile(file);

      try {
        const [result, compressedImg] = await Promise.all([
          scanDlsReal(file),
          compressionPromise,
        ]);

        if (compressedImg.ok) {
          setDlsScannedImage(compressedImg.dataUrl);
        } else {
          setDlsScannedImage(null);
          setDlsImageCaptureError(compressedImg.error);
        }

        setRawDlsOcrResult(result);
        const structuredData: DlsData = result.parsed || EMPTY_DLS_DATA;

        const hasExtractedData = Boolean(
          structuredData.licenseNumber?.trim() || structuredData.fullName?.trim()
        );

        if (!isAdmin && !hasExtractedData) {
          setDlsScanStatus('error');
          return;
        }

        setDlsFormData(structuredData);
        setDlsScanStatus('success');
        if (!isAdmin) {
          playContinueSound();
          setOperatorStep(4);
        }
      } catch {
        const compressedImg = await compressionPromise;
        if (compressedImg.ok) {
          setDlsScannedImage(compressedImg.dataUrl);
        } else {
          setDlsScannedImage(null);
          setDlsImageCaptureError(compressedImg.error);
        }

        if (isAdmin) {
          try {
            const mockResult = await scanDlsMock(file);
            setDlsFormData(mockResult);
            setDlsScanStatus('success');
          } catch {
            setDlsScanStatus('error');
          }
        } else {
          setDlsScanStatus('error');
        }
      }
    },
    [isAdmin]
  );

  const handleOperatorStartScan = (type: DocumentType) => {
    playSelectSound();
    setDocumentType(type);
    setIsDocCameraOpen(true);
  };

  const handleOperatorCameraCapture = (croppedFile: File) => {
    setIsDocCameraOpen(false);
    if (documentType === 'cnic') {
      handleCnicScan(croppedFile);
    } else {
      handleDlsScan(croppedFile);
    }
  };

  const isDocumentValid =
    documentType === 'cnic'
      ? Boolean(
          (cnicFormData.cnicNumber || cnicFormData.cnic) &&
            (cnicFormData.fullName || cnicFormData.name)
        )
      : Boolean(dlsFormData.licenseNumber && dlsFormData.fullName);

  const activeScanStatus = documentType === 'cnic' ? cnicScanStatus : dlsScanStatus;

  const handleFinalSubmit = async () => {
    if (submissionStatus === 'submitting' || createdVisit) {
      return;
    }

    setSubmissionStatus('submitting');
    setSubmissionError(null);

    try {
      const doc = documentType === 'cnic' ? cnicFormData : dlsFormData;
      const payload = {
        fullName:
          documentType === 'cnic'
            ? cnicFormData.fullName || cnicFormData.name
            : dlsFormData.fullName,
        fatherHusbandName:
          documentType === 'cnic'
            ? cnicFormData.fatherHusbandName || cnicFormData.fatherName
            : dlsFormData.fatherHusbandName,
        cnicNumber:
          documentType === 'cnic'
            ? cnicFormData.cnicNumber || cnicFormData.cnic
            : undefined,
        dlsNumber: documentType === 'dls' ? dlsFormData.licenseNumber : undefined,
        category: category || 'VISITOR',
        gender: documentType === 'cnic' ? cnicFormData.gender : undefined,
        dateOfBirth:
          documentType === 'cnic'
            ? cnicFormData.dateOfBirth
            : dlsFormData.dateOfBirth,
        dateOfIssue:
          documentType === 'cnic'
            ? cnicFormData.dateOfIssue
            : dlsFormData.issueDate,
        dateOfExpiry:
          documentType === 'cnic'
            ? cnicFormData.dateOfExpiry
            : dlsFormData.validUpto,
        licensingAuthority:
          documentType === 'dls' ? dlsFormData.licensingAuthority : undefined,
        identification:
          documentType === 'cnic'
            ? cnicFormData.cnicIdentification
            : undefined,
        presentAddress:
          (doc as unknown as Record<string, string | undefined>).presentAddress || undefined,
        permanentAddress:
          (doc as unknown as Record<string, string | undefined>).permanentAddress || undefined,
        phoneNumber: visitorData.phoneNumber.trim() || undefined,
        photoUrl: visitorData.photoPreview,
        cnicImageData: cnicScannedImage || undefined,
        dlsImageData: dlsScannedImage || undefined,
        hostName: visitInfo.meetName,
        department: visitInfo.department,
        departmentId: visitInfo.departmentId || undefined,
        visitorCardNo: visitorData.visitorCardNo,
        belongings:
          visitorData.hasBelongings && visitorData.belongings?.trim()
            ? visitorData.belongings.trim()
            : undefined,
        entryGateId: currentGate?.id,
      };

      const res = await fetch('/api/visits/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'CARD_ALREADY_ASSIGNED' && !isAdmin) {
          throw new Error(t('visitor_card_already_assigned'));
        }
        throw new Error(data.error || 'Failed to check in visitor');
      }

      const activeCaptureError =
        documentType === 'cnic' ? cnicImageCaptureError : dlsImageCaptureError;

      if (data.imageStorageStatus === 'failed' || activeCaptureError) {
        setImageStorageStatus('failed');
        setImageStorageError(data.imageStorageError || activeCaptureError || null);
      } else if (data.imageStorageStatus === 'saved') {
        setImageStorageStatus('saved');
        setImageStorageError(null);
      } else {
        setImageStorageStatus('none');
        setImageStorageError(null);
      }

      setCreatedVisit(data.visit);
      setSubmissionStatus('success');
      playRegistrationSuccessSound();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed';
      setSubmissionError(msg);
      setSubmissionStatus('error');
    }
  };

  // Retry saving the scanned CNIC/DLS image to the already-created Person record without creating duplicate visits
  const handleRetrySaveDocumentImage = async () => {
    const personObj = (createdVisit?.person as Record<string, unknown> | undefined) || null;
    const personId = (personObj?.id as string | undefined) || (createdVisit?.personId as string | undefined);
    const activeImage = documentType === 'cnic' ? cnicScannedImage : dlsScannedImage;

    if (!personId || !activeImage) {
      setImageStorageError(
        t('image_save_failed_warning', 'Scanned ID card image is unavailable. Please rescan if needed.')
      );
      return;
    }

    setIsRetryingImageSave(true);
    try {
      const res = await fetch(`/api/visitors/${personId}/document-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: documentType,
          imageDataUrl: activeImage,
          cnicImageData: documentType === 'cnic' ? activeImage : undefined,
          dlsImageData: documentType === 'dls' ? activeImage : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to save ID image');
      }
      setImageStorageStatus('saved');
      setImageStorageError(null);
      if (createdVisit) {
        const currentPerson = (createdVisit.person as Record<string, unknown> | undefined) || {};
        setCreatedVisit({
          ...createdVisit,
          person: {
            ...currentPerson,
            hasCnicImage: json.hasCnicImage ?? currentPerson.hasCnicImage,
            hasDlsImage: json.hasDlsImage ?? currentPerson.hasDlsImage,
          },
        });
      }
    } catch (err: unknown) {
      setImageStorageStatus('failed');
      setImageStorageError(err instanceof Error ? err.message : 'Failed to save ID image');
    } finally {
      setIsRetryingImageSave(false);
    }
  };

  const handleResetAll = () => {
    setCurrentStep(1);
    setOperatorStep(1);
    setCategory(isAdmin ? defaultCategory || 'VISITOR' : '');
    setVisitInfo(EMPTY_VISIT_INFO);
    setCnicFormData(EMPTY_CNIC_DATA);
    setCnicScanStatus('idle');
    setCnicScannedImage(null);
    setCnicImageCaptureError(null);
    setDlsFormData(EMPTY_DLS_DATA);
    setDlsScanStatus('idle');
    setDlsScannedImage(null);
    setDlsImageCaptureError(null);
    setVisitorData(EMPTY_VISITOR_DATA);
    setSubmissionStatus('idle');
    setSubmissionError(null);
    setCreatedVisit(null);
    setImageStorageStatus('none');
    setImageStorageError(null);
    setIsRetryingImageSave(false);
    setShowBadge(false);
    setAutoPrintBadge(false);
  };

  if (!isOpen) return null;

  const getOperatorStepTitle = (step: 1 | 2 | 3 | 4 | 5 | 6) => {
    switch (step) {
      case 1:
        return t('select_category_title', 'Select Visitor Category');
      case 2:
        return t('visit_info_title', 'Visit Information');
      case 3:
        return t('scan_id_card_title', 'Scan ID Card');
      case 4:
        return t('review_scanned_details_title', 'Review Scanned Details');
      case 5:
        return t('capture_visitor_photo', 'Capture Visitor Photo');
      case 6:
        return t('registration_details_title', 'Registration Details');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-6 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
        <div className="w-full max-w-2xl my-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
          {/* Header */}
          {isAdmin ? (
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                    New Check-In Registration
                  </h2>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="text-xs font-bold px-2 py-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 focus:outline-none"
                  >
                    <option value="VISITOR">Visitor</option>
                    <option value="VENDOR">Vendor</option>
                    <option value="INTERVIEW">Interview</option>
                    <option value="SPECIAL_GUEST">Special Guest</option>
                    <option value="CONTRACTOR">Contractor</option>
                    <option value="DELIVERY">Delivery</option>
                  </select>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Gate:{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {currentGate?.name || 'Main Gate'}
                  </span>
                </p>
              </div>

              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 shrink-0">
              <div className={isUr ? 'text-right' : 'text-left'}>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                    {getOperatorStepTitle(operatorStep)}
                  </h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {t('step_progress_label', 'Step')} {operatorStep}/6
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('gate_prefix', 'Gate')}:{' '}
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {currentGate?.name || 'Main Gate'}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    handleResetAll();
                    onClose();
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title={t('close', 'Close')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Modal Scrollable Body */}
          {isAdmin ? (
            /* ── ORIGINAL ADMIN 3-STEP BODY (100% UNCHANGED) ── */
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {currentStep === 1 && (
                <VisitInfoStep
                  data={visitInfo}
                  onChange={setVisitInfo}
                  onNext={() => setCurrentStep(2)}
                />
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setDocumentType('cnic')}
                        className={`flex-1 py-2.5 px-4 text-center rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                          documentType === 'cnic'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>Capture CNIC</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDocumentType('dls')}
                        className={`flex-1 py-2.5 px-4 text-center rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                          documentType === 'dls'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>Capture Driving License</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    {documentType === 'cnic' ? (
                      <CnicScanner
                        key="scanner-cnic"
                        documentType="cnic"
                        documentLabel="CNIC"
                        uploadLabel="Upload CNIC"
                        captureLabel="Capture CNIC"
                        scanButtonLabel="Scan CNIC"
                        placeholderText="Upload or capture a Pakistani CNIC image"
                        onScan={handleCnicScan}
                        status={cnicScanStatus}
                        statusMessage={getCnicStatusMessage(cnicScanStatus)}
                      />
                    ) : (
                      <CnicScanner
                        key="scanner-dls"
                        documentType="dls"
                        documentLabel="Driving License"
                        uploadLabel="Upload Driving License"
                        captureLabel="Capture Driving License"
                        scanButtonLabel="Scan Driving License"
                        placeholderText="Upload or capture a Driving License Sindh image"
                        onScan={handleDlsScan}
                        status={dlsScanStatus}
                        statusMessage={getDlsStatusMessage(dlsScanStatus)}
                      />
                    )}
                  </div>

                  <div>
                    {documentType === 'cnic' ? (
                      <CnicForm data={cnicFormData} onChange={setCnicFormData} />
                    ) : (
                      <DlsForm data={dlsFormData} onChange={setDlsFormData} />
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="py-3 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-2xs"
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      disabled={!isDocumentValid}
                      className={`flex-1 max-w-xs py-3 px-6 rounded-xl text-xs sm:text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition-all ${
                        isDocumentValid
                          ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed shadow-none'
                      }`}
                    >
                      <span>Continue to Visitor Details</span>
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div>
                  <VisitorStep
                    visitInfo={visitInfo}
                    documentType={documentType}
                    cnicData={cnicFormData}
                    dlsData={dlsFormData}
                    visitorData={visitorData}
                    onChangeVisitorData={setVisitorData}
                    onBack={() => setCurrentStep(2)}
                    onSubmit={handleFinalSubmit}
                    submissionStatus={submissionStatus}
                    submissionError={submissionError}
                    onResetAll={handleResetAll}
                  />
                </div>
              )}
            </div>
          ) : (
            /* ── OPERATOR 6-STEP MOBILE-FIRST REGISTRATION FLOW ── */
            <div className="p-3.5 sm:p-5 overflow-y-auto flex-1 space-y-4">
              {/* STEP 1: SELECT VISITOR CATEGORY (Auto-advances to Step 2) */}
              {operatorStep === 1 && (
                <VisitInfoStep
                  operatorMode="category"
                  category={category}
                  onCategoryChange={setCategory}
                  data={visitInfo}
                  onChange={setVisitInfo}
                  onNext={() => setOperatorStep(2)}
                />
              )}

              {/* STEP 2: VISIT INFORMATION (Auto-advances to Step 3 when both fields are valid) */}
              {operatorStep === 2 && (
                <VisitInfoStep
                  operatorMode="visit-info"
                  category={category}
                  onCategoryChange={setCategory}
                  data={visitInfo}
                  onChange={setVisitInfo}
                  onBack={() => setOperatorStep(1)}
                  onNext={() => setOperatorStep(3)}
                />
              )}

              {/* STEP 3: SCAN ID CARD (Existing CNIC/DLS Scanning UI Preserved) */}
              {operatorStep === 3 && (
                <div className="space-y-4">
                  {/* Branded Gatekeeper Loading State while OCR reads card */}
                  {activeScanStatus === 'scanning' && (
                    <GatekeeperLoader
                      variant="card"
                      title={t('ocr_scanning_title', 'Reading Card Details...')}
                      subtitle={t(
                        'ocr_scanning_subtitle',
                        'Please wait a moment while OCR extracts the information'
                      )}
                    />
                  )}

                  {/* Scan Failed Prominent Error Card */}
                  {activeScanStatus === 'error' && (
                    <div className="rounded-2xl border-2 border-red-300 dark:border-red-800 bg-red-50/90 dark:bg-red-950/40 p-5 sm:p-6 flex flex-col items-center justify-center text-center space-y-3 animate-in zoom-in-95 duration-200">
                      <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center shadow-sm">
                        <AlertTriangle className="w-8 h-8 stroke-[2.2]" />
                      </div>
                      <div className="space-y-1 max-w-md">
                        <h3 className="text-base sm:text-lg font-extrabold text-red-700 dark:text-red-300">
                          {t('scan_failed_title', 'Scan failed. Please scan again.')}
                        </h3>
                        <p className="text-xs sm:text-sm font-medium text-red-600/90 dark:text-red-300/90">
                          {t(
                            'scan_failed_subtitle',
                            'Hold the card steady in good light inside the frame and try again.'
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOperatorStartScan(documentType)}
                        className="py-3 px-6 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-xs sm:text-sm font-extrabold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>{t('scan_again_btn', 'Scan Again')}</span>
                      </button>
                    </div>
                  )}

                  {/* Two Large Visual Scanning Option Cards */}
                  {activeScanStatus !== 'scanning' && (
                    <div className="space-y-3">
                      <div className={isUr ? 'text-right' : 'text-left'}>
                        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                          {t('scan_id_card_title', 'Scan ID Card')}
                        </h2>
                        <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                          {t(
                            'choose_id_scan_subtitle',
                            'Tap a card below to open the camera and scan the visitor ID'
                          )}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Option A: Scan CNIC (Green Primary Accent) */}
                        <button
                          type="button"
                          onClick={() => handleOperatorStartScan('cnic')}
                          className="group relative flex flex-col items-center justify-center text-center p-5 sm:p-6 rounded-2xl border-2 border-emerald-500/80 dark:border-emerald-500/70 bg-emerald-50/70 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 transition-all duration-150 cursor-pointer active:scale-[0.98] shadow-sm hover:shadow-md min-h-[165px] sm:min-h-[195px]"
                        >
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-3 gk-pulse-emerald transition-transform group-hover:scale-105">
                            <IconPakistaniCnic className="w-12 h-12 sm:w-14 sm:h-14" />
                          </div>
                          <span className="text-sm sm:text-base font-extrabold text-emerald-950 dark:text-emerald-100 leading-snug">
                            {t('scan_cnic_title', 'Scan CNIC')}
                          </span>
                          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mt-1 flex items-center justify-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 shrink-0" />
                            <span>{t('scan_cnic_subtitle', 'Pakistani Smart Card or NADRA CNIC')}</span>
                          </span>
                        </button>

                        {/* Option B: Scan Driving Licence (Blue Primary Accent) */}
                        <button
                          type="button"
                          onClick={() => handleOperatorStartScan('dls')}
                          className="group relative flex flex-col items-center justify-center text-center p-5 sm:p-6 rounded-2xl border-2 border-blue-500/80 dark:border-blue-500/70 bg-blue-50/70 hover:bg-blue-50 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 transition-all duration-150 cursor-pointer active:scale-[0.98] shadow-sm hover:shadow-md min-h-[165px] sm:min-h-[195px]"
                        >
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center mb-3 gk-pulse-blue transition-transform group-hover:scale-105">
                            <IconDrivingLicence className="w-12 h-12 sm:w-14 sm:h-14" />
                          </div>
                          <span className="text-sm sm:text-base font-extrabold text-blue-950 dark:text-blue-100 leading-snug">
                            {t('scan_dls_title', 'Scan Driving Licence')}
                          </span>
                          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 mt-1 flex items-center justify-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 shrink-0" />
                            <span>{t('scan_dls_subtitle', 'Driving Licence Card')}</span>
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Back Navigation */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        playBackSound();
                        setOperatorStep(2);
                      }}
                      disabled={activeScanStatus === 'scanning'}
                      className="py-2.5 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-2 disabled:opacity-50"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>{t('back_btn', 'Back')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW SCANNED DETAILS (Compact Form + Inline Scan Complete Line + Continue) */}
              {operatorStep === 4 && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div>
                    {documentType === 'cnic' ? (
                      <CnicForm
                        data={cnicFormData}
                        onChange={setCnicFormData}
                        onRescan={() => setOperatorStep(3)}
                      />
                    ) : (
                      <DlsForm
                        data={dlsFormData}
                        onChange={setDlsFormData}
                        onRescan={() => setOperatorStep(3)}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        playBackSound();
                        setOperatorStep(3);
                      }}
                      className="py-3 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>{t('back_btn', 'Back')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playContinueSound();
                        setOperatorStep(5);
                      }}
                      disabled={!isDocumentValid}
                      className={`flex-1 max-w-xs py-3 px-6 rounded-xl text-xs sm:text-sm font-extrabold shadow-xs flex items-center justify-center gap-2 transition-all ${
                        isDocumentValid
                          ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white cursor-pointer'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed shadow-none'
                      }`}
                    >
                      <span>{t('continue_btn', 'Continue')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5: CAPTURE VISITOR PHOTO */}
              {operatorStep === 5 && (
                <VisitorStep
                  operatorMode="photo"
                  visitInfo={visitInfo}
                  documentType={documentType}
                  cnicData={cnicFormData}
                  dlsData={dlsFormData}
                  visitorData={visitorData}
                  onChangeVisitorData={setVisitorData}
                  onBack={() => setOperatorStep(4)}
                  onNextPhotoStep={() => setOperatorStep(6)}
                  onSubmit={handleFinalSubmit}
                  submissionStatus={submissionStatus}
                  submissionError={submissionError}
                  onResetAll={handleResetAll}
                />
              )}

              {/* STEP 6: REGISTRATION DETAILS (Phone, VC Number, Carrying Items & Final Submit) */}
              {operatorStep === 6 && (
                <VisitorStep
                  operatorMode="details"
                  visitInfo={visitInfo}
                  documentType={documentType}
                  cnicData={cnicFormData}
                  dlsData={dlsFormData}
                  visitorData={visitorData}
                  onChangeVisitorData={setVisitorData}
                  onBack={() => setOperatorStep(5)}
                  onSubmit={handleFinalSubmit}
                  submissionStatus={submissionStatus}
                  submissionError={submissionError}
                  onResetAll={handleResetAll}
                />
              )}

              {/* Direct Camera Modal for Operator Document Capture */}
              <CnicCameraModal
                isOpen={isDocCameraOpen}
                onClose={() => setIsDocCameraOpen(false)}
                onCapture={handleOperatorCameraCapture}
                documentTitle={documentType === 'cnic' ? 'CNIC' : 'Driving Licence'}
              />
            </div>
          )}
        </div>
      </div>

      {/* STEP 7: REGISTRATION SUCCESS / VISITOR CARD */}
      {submissionStatus === 'success' && createdVisit && (
        <RegistrationSuccessModal
          isOpen={submissionStatus === 'success'}
          onClose={() => {
            handleResetAll();
            onClose();
          }}
          visit={createdVisit}
          imageStorageStatus={imageStorageStatus}
          imageStorageError={imageStorageError}
          onRetrySaveImage={handleRetrySaveDocumentImage}
          isRetryingImageSave={isRetryingImageSave}
          onViewCard={() => {
            setAutoPrintBadge(false);
            setShowBadge(true);
          }}
          onPrintBadge={() => {
            setAutoPrintBadge(true);
            setShowBadge(true);
          }}
          onRegisterNext={() => handleResetAll()}
        />
      )}

      {/* Visitor Badge Modal (View Card & Direct Print Mode) */}
      {showBadge && createdVisit && (
        <VisitorBadgeModal
          isOpen={showBadge}
          onClose={() => {
            setShowBadge(false);
            setAutoPrintBadge(false);
          }}
          visit={createdVisit}
          autoPrint={autoPrintBadge}
          onAutoPrintTriggered={() => setAutoPrintBadge(false)}
        />
      )}
    </>
  );
}

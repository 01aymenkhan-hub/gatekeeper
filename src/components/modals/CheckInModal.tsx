'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { X, AlertTriangle, RotateCcw, CheckCircle2, Camera, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import VisitInfoStep from '../VisitInfoStep';
import CnicScanner from '../CnicScanner';
import CnicCameraModal from '../CnicCameraModal';
import CnicForm from '../CnicForm';
import DlsForm from '../DlsForm';
import VisitorStep from '../VisitorStep';
import VisitorBadgeModal from './VisitorBadgeModal';
import RegistrationSuccessModal from './RegistrationSuccessModal';
import { CnicData, ScanStatus } from '../../types/cnic';
import { DlsData, DocumentType } from '../../types/dls';
import { VisitInfoData, VisitorStepData, SubmissionStatus } from '../../types/visitor';
import { scanCnicReal, scanCnicMock, RawOcrResponse } from '../../services/cnicApi';
import { scanDlsReal, scanDlsMock, RawDlsResponse } from '../../services/dlsApi';
import { parseCnicOcr } from '../../utils/cnicParser';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { IconPakistaniCnic, IconDrivingLicence } from '../icons/OperatorTaskIcons';

const EMPTY_VISIT_INFO: VisitInfoData = {
  meetName: '',
  department: '',
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

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<string>(defaultCategory);
  const [visitInfo, setVisitInfo] = useState<VisitInfoData>(EMPTY_VISIT_INFO);
  const [documentType, setDocumentType] = useState<DocumentType>('cnic');
  const [isDocCameraOpen, setIsDocCameraOpen] = useState(false);

  // CNIC Form State
  const [cnicFormData, setCnicFormData] = useState<CnicData>(EMPTY_CNIC_DATA);
  const [cnicScanStatus, setCnicScanStatus] = useState<ScanStatus>('idle');
  const [, setRawCnicOcrResult] = useState<RawOcrResponse | null>(null);

  // DLS Form State
  const [dlsFormData, setDlsFormData] = useState<DlsData>(EMPTY_DLS_DATA);
  const [dlsScanStatus, setDlsScanStatus] = useState<ScanStatus>('idle');
  const [, setRawDlsOcrResult] = useState<RawDlsResponse | null>(null);

  // Visitor Data
  const [visitorData, setVisitorData] = useState<VisitorStepData>(EMPTY_VISITOR_DATA);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [createdVisit, setCreatedVisit] = useState<any>(null);
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCategory(defaultCategory || 'VISITOR');
    }
  }, [isOpen, defaultCategory]);

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
      try {
        const result = await scanCnicReal(file);
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
      } catch {
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
      try {
        const result = await scanDlsReal(file);
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
      } catch {
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
        category,
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
        presentAddress: (doc as any).presentAddress || undefined,
        permanentAddress: (doc as any).permanentAddress || undefined,
        phoneNumber: visitorData.phoneNumber,
        photoUrl: visitorData.photoPreview,
        hostName: visitInfo.meetName,
        department: visitInfo.department,
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

      setCreatedVisit(data.visit);
      setSubmissionStatus('success');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setSubmissionError(err?.message || 'Submission failed');
      setSubmissionStatus('error');
    }
  };

  const handleResetAll = () => {
    setCurrentStep(1);
    setVisitInfo(EMPTY_VISIT_INFO);
    setCnicFormData(EMPTY_CNIC_DATA);
    setCnicScanStatus('idle');
    setDlsFormData(EMPTY_DLS_DATA);
    setDlsScanStatus('idle');
    setVisitorData(EMPTY_VISITOR_DATA);
    setSubmissionStatus('idle');
    setSubmissionError(null);
    setCreatedVisit(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
        <div className="w-full max-w-3xl my-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
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
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 shrink-0">
              <div className={isUr ? 'text-right' : 'text-left'}>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                    {t('new_checkin_title')}
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {currentStep === 1
                      ? t('step_1_badge')
                      : currentStep === 2
                      ? t('step_2_badge')
                      : t('step_3_badge')}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('gate_prefix')}:{' '}
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {currentGate?.name || 'Main Gate'}
                  </span>
                </p>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Modal Scrollable Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
            {/* STEP 1: VISIT INFORMATION */}
            {currentStep === 1 && (
              <VisitInfoStep
                data={visitInfo}
                onChange={setVisitInfo}
                onNext={() => setCurrentStep(2)}
                category={category}
                onCategoryChange={setCategory}
              />
            )}

            {/* STEP 2: DOCUMENT SCANNING */}
            {currentStep === 2 && (
              isAdmin ? (
                /* ── Original Admin Step 2 UI ── */
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
              ) : (
                /* ── Operator Visual-First Step 2 UI ── */
                <div className="space-y-5">
                  {activeScanStatus !== 'success' ? (
                    <>
                      {/* Scanning in Progress State */}
                      {activeScanStatus === 'scanning' && (
                        <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/30 p-8 sm:p-10 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-200">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm">
                            <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin" />
                          </div>
                          <div className="space-y-1.5">
                            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                              {t('ocr_scanning_title')}
                            </h3>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                              {t('ocr_scanning_subtitle')}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Scan Failed Prominent Error Card */}
                      {activeScanStatus === 'error' && (
                        <div className="rounded-2xl border-2 border-red-300 dark:border-red-800 bg-red-50/90 dark:bg-red-950/40 p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95 duration-200">
                          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center shadow-sm">
                            <AlertTriangle className="w-10 h-10 stroke-[2.2]" />
                          </div>
                          <div className="space-y-1.5 max-w-md">
                            <h3 className="text-lg sm:text-xl font-extrabold text-red-700 dark:text-red-300">
                              {t('scan_failed_title')}
                            </h3>
                            <p className="text-sm font-medium text-red-600/90 dark:text-red-300/90">
                              {t('scan_failed_subtitle')}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOperatorStartScan(documentType)}
                            className="py-3.5 px-7 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-sm sm:text-base font-extrabold shadow-md flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                          >
                            <Camera className="w-5 h-5" />
                            <span>{t('scan_again_btn')}</span>
                          </button>
                        </div>
                      )}

                      {/* Two Large Visual Scanning Option Cards */}
                      {activeScanStatus !== 'scanning' && (
                        <div className="space-y-4">
                          <div className={isUr ? 'text-right' : 'text-left'}>
                            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                              {t('choose_id_scan_title')}
                            </h2>
                            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                              {t('choose_id_scan_subtitle')}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Option A: Scan CNIC (Green Primary Accent) */}
                            <button
                              type="button"
                              onClick={() => handleOperatorStartScan('cnic')}
                              className="group relative flex flex-col items-center justify-center text-center p-6 sm:p-8 rounded-2xl border-2 border-emerald-500/80 dark:border-emerald-500/70 bg-emerald-50/70 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 transition-all duration-150 cursor-pointer active:scale-[0.98] shadow-sm hover:shadow-md min-h-[190px] sm:min-h-[220px]"
                            >
                              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-4 gk-pulse-emerald transition-transform group-hover:scale-105">
                                <IconPakistaniCnic className="w-14 h-14 sm:w-16 sm:h-16" />
                              </div>
                              <span className="text-base sm:text-lg font-extrabold text-emerald-950 dark:text-emerald-100 leading-snug">
                                {t('scan_cnic_title')}
                              </span>
                              <span className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300 mt-1.5 flex items-center justify-center gap-1.5">
                                <Camera className="w-4 h-4 shrink-0" />
                                <span>{t('scan_cnic_subtitle')}</span>
                              </span>
                            </button>

                            {/* Option B: Scan Driving Licence (Blue Primary Accent) */}
                            <button
                              type="button"
                              onClick={() => handleOperatorStartScan('dls')}
                              className="group relative flex flex-col items-center justify-center text-center p-6 sm:p-8 rounded-2xl border-2 border-blue-500/80 dark:border-blue-500/70 bg-blue-50/70 hover:bg-blue-50 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 transition-all duration-150 cursor-pointer active:scale-[0.98] shadow-sm hover:shadow-md min-h-[190px] sm:min-h-[220px]"
                            >
                              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center mb-4 gk-pulse-blue transition-transform group-hover:scale-105">
                                <IconDrivingLicence className="w-14 h-14 sm:w-16 sm:h-16" />
                              </div>
                              <span className="text-base sm:text-lg font-extrabold text-blue-950 dark:text-blue-100 leading-snug">
                                {t('scan_dls_title')}
                              </span>
                              <span className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 mt-1.5 flex items-center justify-center gap-1.5">
                                <Camera className="w-4 h-4 shrink-0" />
                                <span>{t('scan_dls_subtitle')}</span>
                              </span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Back Button when waiting for scan */}
                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          disabled={activeScanStatus === 'scanning'}
                          className="py-3.5 px-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm sm:text-base font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-2 disabled:opacity-50"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>{t('back_btn')}</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    /* ── After Successful Scan: Hide Large Cards & Focus Directly on Extracted Details Form ── */
                    <div className="space-y-4 animate-in fade-in duration-200">
                      {/* Compact Top Bar: Success Badge + Rescan Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="text-sm sm:text-base font-extrabold text-emerald-900 dark:text-emerald-200">
                            {t('scan_success_badge')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOperatorStartScan('cnic')}
                            className="py-2 px-3.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{t('scan_cnic_title')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOperatorStartScan('dls')}
                            className="py-2 px-3.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{t('scan_dls_title')}</span>
                          </button>
                        </div>
                      </div>

                      {/* Extracted Details Form Immediately Visible */}
                      <div>
                        {documentType === 'cnic' ? (
                          <CnicForm data={cnicFormData} onChange={setCnicFormData} />
                        ) : (
                          <DlsForm data={dlsFormData} onChange={setDlsFormData} />
                        )}
                      </div>

                      {/* Bottom Navigation */}
                      <div className="flex items-center justify-between gap-4 pt-2">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className="py-3.5 px-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm sm:text-base font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-2"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>{t('back_btn')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCurrentStep(3)}
                          disabled={!isDocumentValid}
                          className={`flex-1 max-w-xs py-3.5 px-6 rounded-xl text-sm sm:text-base font-bold shadow-xs flex items-center justify-center gap-2 transition-all ${
                            isDocumentValid
                              ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed shadow-none'
                          }`}
                        >
                          <span>{t('continue_to_visitor_details')}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Direct Camera Modal for Operator Document Capture */}
                  <CnicCameraModal
                    isOpen={isDocCameraOpen}
                    onClose={() => setIsDocCameraOpen(false)}
                    onCapture={handleOperatorCameraCapture}
                    documentTitle={documentType === 'cnic' ? 'CNIC' : 'Driving Licence'}
                  />
                </div>
              )
            )}

            {/* STEP 3: VISITOR INFORMATION */}
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
        </div>
      </div>

      {/* Registration Success Modal */}
      {submissionStatus === 'success' && createdVisit && (
        <RegistrationSuccessModal
          isOpen={submissionStatus === 'success'}
          onClose={() => {
            handleResetAll();
            onClose();
          }}
          visit={createdVisit}
          onViewCard={() => setShowBadge(true)}
          onPrintBadge={() => setShowBadge(true)}
          onRegisterNext={() => handleResetAll()}
        />
      )}

      {/* Visitor Badge Modal */}
      {showBadge && createdVisit && (
        <VisitorBadgeModal
          isOpen={showBadge}
          onClose={() => setShowBadge(false)}
          visit={createdVisit}
        />
      )}
    </>
  );
}

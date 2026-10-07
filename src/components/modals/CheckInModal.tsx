'use client';

import React, { useState, useCallback } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import VisitInfoStep from '../VisitInfoStep';
import CnicScanner from '../CnicScanner';
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
  const { currentGate } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<string>(defaultCategory);
  const [visitInfo, setVisitInfo] = useState<VisitInfoData>(EMPTY_VISIT_INFO);
  const [documentType, setDocumentType] = useState<DocumentType>('cnic');

  // CNIC Form State
  const [cnicFormData, setCnicFormData] = useState<CnicData>(EMPTY_CNIC_DATA);
  const [cnicScanStatus, setCnicScanStatus] = useState<ScanStatus>('idle');
  const [rawCnicOcrResult, setRawCnicOcrResult] = useState<RawOcrResponse | null>(null);

  // DLS Form State
  const [dlsFormData, setDlsFormData] = useState<DlsData>(EMPTY_DLS_DATA);
  const [dlsScanStatus, setDlsScanStatus] = useState<ScanStatus>('idle');
  const [rawDlsOcrResult, setRawDlsOcrResult] = useState<RawDlsResponse | null>(null);

  // Visitor Data
  const [visitorData, setVisitorData] = useState<VisitorStepData>(EMPTY_VISITOR_DATA);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [createdVisit, setCreatedVisit] = useState<any>(null);
  const [showBadge, setShowBadge] = useState(false);

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

  const handleCnicScan = useCallback(async (file: File) => {
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

      setCnicFormData(structuredData);
      setCnicScanStatus('success');
    } catch {
      try {
        const mockResult = await scanCnicMock(file);
        setCnicFormData(mockResult);
        setCnicScanStatus('success');
      } catch {
        setCnicScanStatus('error');
      }
    }
  }, []);

  const handleDlsScan = useCallback(async (file: File) => {
    setDlsScanStatus('scanning');
    try {
      const result = await scanDlsReal(file);
      setRawDlsOcrResult(result);
      const structuredData: DlsData = result.parsed || EMPTY_DLS_DATA;
      setDlsFormData(structuredData);
      setDlsScanStatus('success');
    } catch {
      try {
        const mockResult = await scanDlsMock(file);
        setDlsFormData(mockResult);
        setDlsScanStatus('success');
      } catch {
        setDlsScanStatus('error');
      }
    }
  }, []);

  const isDocumentValid =
    documentType === 'cnic'
      ? Boolean(
          (cnicFormData.cnicNumber || cnicFormData.cnic) &&
            (cnicFormData.fullName || cnicFormData.name)
        )
      : Boolean(dlsFormData.licenseNumber && dlsFormData.fullName);

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

          {/* Modal Scrollable Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* STEP 1: VISIT INFORMATION */}
            {currentStep === 1 && (
              <VisitInfoStep
                data={visitInfo}
                onChange={setVisitInfo}
                onNext={() => setCurrentStep(2)}
              />
            )}

            {/* STEP 2: DOCUMENT SCANNING */}
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

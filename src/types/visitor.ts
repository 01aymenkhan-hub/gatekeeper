import { CnicData } from "./cnic";
import { DlsData, DocumentType } from "./dls";

export type SubmissionStatus = "idle" | "submitting" | "success" | "error";

export interface VisitInfoData {
  /** Person the visitor is here to meet */
  meetName: string;
  /** Department of the person being visited */
  department: string;
}

export interface VisitorStepData {
  /** Captured or uploaded visitor photo (Data URL or Object URL for display) */
  photoPreview: string | null;
  /** Actual photo file if available */
  photoFile: File | null;
  /** Visitor phone number (11 digits, starts with 03) */
  phoneNumber: string;
  /** Physical visitor card number assigned by guard */
  visitorCardNo: string;
  /** Whether the visitor is carrying belongings/items (default false) */
  hasBelongings?: boolean;
  /** Description of carried belongings/items */
  belongings?: string;
}

export interface CompleteVisitorRecord {
  id?: string;
  visitInfo: VisitInfoData;
  documentType: DocumentType;
  documentData: CnicData | DlsData;
  visitorPhotoPreview: string | null;
  phoneNumber: string;
  visitorCardNo: string;
  belongings?: string;
  submittedAt: string;
}

import { CnicData } from "../types/cnic";
import { OcrDetailItem } from "../services/cnicApi";

/**
 * Geometric helper class for bounding boxes.
 */
class BoxItem {
  text: string;
  confidence: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;

  constructor(item: OcrDetailItem) {
    this.text = (item.text || "").trim();
    this.confidence = item.confidence || 0.0;
    const bbox = item.bbox || [];
    if (bbox.length >= 4) {
      const xs = bbox.map((p) => p[0]);
      const ys = bbox.map((p) => p[1]);
      this.minX = Math.min(...xs);
      this.maxX = Math.max(...xs);
      this.minY = Math.min(...ys);
      this.maxY = Math.max(...ys);
    } else {
      this.minX = 0;
      this.maxX = 0;
      this.minY = 0;
      this.maxY = 0;
    }
    this.centerX = (this.minX + this.maxX) / 2;
    this.centerY = (this.minY + this.maxY) / 2;
    this.width = Math.max(0, this.maxX - this.minX);
    this.height = Math.max(0, this.maxY - this.minY);
  }

  isBelow(other: BoxItem, maxVerticalDist = 120): boolean {
    if (this.minY < other.minY - 5) return false;
    const vertDist = this.minY - other.maxY;
    if (vertDist > maxVerticalDist || vertDist < -15) return false;
    const horizOverlap = !(this.maxX < other.minX - 40 || this.minX > other.maxX + 60);
    const centerDist = Math.abs(this.centerX - other.centerX);
    return horizOverlap || centerDist < Math.max(other.width, this.width) * 1.2;
  }

  isToTheRight(other: BoxItem, maxHorizontalDist = 400): boolean {
    const horizDist = this.minX - other.maxX;
    if (horizDist < -10 || horizDist > maxHorizontalDist) return false;
    const vertDiff = Math.abs(this.centerY - other.centerY);
    const maxH = Math.max(this.height, other.height, 15);
    return vertDiff <= maxH * 1.2;
  }

  distanceFrom(other: BoxItem): number {
    const dx = this.centerX - other.centerX;
    const dy = this.centerY - other.centerY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

/**
 * Normalizes a date string into YYYY-MM-DD for HTML date inputs.
 */
export function normalizeDate(text: string): string {
  if (!text) return "";

  // DD.MM.YYYY or DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = text.match(/\b(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})\b/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
      return `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
    }
  }

  // YYYY-MM-DD
  const ymdMatch = text.match(/\b(\d{4})[\.\/\-](\d{1,2})[\.\/\-](\d{1,2})\b/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
      return `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
    }
  }

  return "";
}

/**
 * Normalizes a Pakistani CNIC number into standard XXXXX-XXXXXXX-X format.
 */
export function normalizeCnic(text: string): string {
  if (!text) return "";

  // Standard pattern with hyphens/spaces
  const match = text.match(/\b(\d{5})[-\s]?(\d{7})[-\s]?(\d{1})\b/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  // Pure digits: verify 13 digits
  const digits = text.replace(/[^\d]/g, "");
  if (digits.length === 13 && "1234567".includes(digits[0])) {
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  }

  return "";
}

/**
 * Normalizes gender into 'Male' or 'Female'.
 */
export function normalizeGender(text: string): "Male" | "Female" | "" {
  const val = (text || "").trim().toLowerCase();
  if (val === "m" || val === "male" || val.startsWith("m")) return "Male";
  if (val === "f" || val === "female" || val.startsWith("f")) return "Female";
  return "";
}

const HEADER_KEYWORDS = [
  "pakistan",
  "islamic",
  "republic",
  "national",
  "identity",
  "card",
  "nadra",
  "government",
  "signature",
  "holder",
  "holder's",
];

const KNOWN_LABELS = [
  "name",
  "father name",
  "father",
  "husband name",
  "husband",
  "gender",
  "country of stay",
  "identity number",
  "date of birth",
  "date of issue",
  "date of expiry",
  "photo",
  "[photo]",
];

function isNameCandidate(text: string): boolean {
  const clean = text.trim();
  if (clean.length < 3) return false;
  const lower = clean.toLowerCase();

  if (KNOWN_LABELS.includes(lower)) return false;
  for (const kw of HEADER_KEYWORDS) {
    if (lower.includes(kw) && lower.split(/\s+/).length <= 3) return false;
  }
  if (/\d/.test(clean)) return false;
  return /^[A-Za-z\s\.\-']+$/.test(clean);
}

/**
 * Parses raw OCR detail items into structured CnicData.
 */
export function parseCnicOcr(items: OcrDetailItem[]): CnicData {
  const boxes = items
    .filter((it) => (it.text || "").trim().length > 0)
    .map((it) => new BoxItem(it));

  const parsed: CnicData = {
    name: "",
    fatherName: "",
    gender: "",
    countryOfStay: "Pakistan",
    cnic: "",
    dateOfBirth: "",
    dateOfIssue: "",
    dateOfExpiry: "",
    fullName: "",
    fatherHusbandName: "",
    cnicNumber: "",
  };

  const consumed = new Set<number>();

  // 1. CNIC Number
  for (let i = 0; i < boxes.length; i++) {
    const cnic = normalizeCnic(boxes[i].text);
    if (cnic) {
      parsed.cnicNumber = cnic;
      consumed.add(i);
      break;
    }
  }

  // 2. Dates
  let dobLabel: BoxItem | null = null;
  let doiLabel: BoxItem | null = null;
  let doeLabel: BoxItem | null = null;

  for (let i = 0; i < boxes.length; i++) {
    if (consumed.has(i)) continue;
    const lower = boxes[i].text.toLowerCase();

    if ((lower.includes("birth") || lower.includes("dob")) && !dobLabel) {
      const d = normalizeDate(boxes[i].text);
      if (d) {
        parsed.dateOfBirth = d;
        consumed.add(i);
      } else {
        dobLabel = boxes[i];
      }
    } else if ((lower.includes("issue") || lower.includes("issuance")) && !doiLabel) {
      const d = normalizeDate(boxes[i].text);
      if (d) {
        parsed.dateOfIssue = d;
        consumed.add(i);
      } else {
        doiLabel = boxes[i];
      }
    } else if ((lower.includes("expiry") || lower.includes("expire") || lower.includes("valid")) && !doeLabel) {
      const d = normalizeDate(boxes[i].text);
      if (d) {
        parsed.dateOfExpiry = d;
        consumed.add(i);
      } else {
        doeLabel = boxes[i];
      }
    }
  }

  const candidateDates: Array<{ idx: number; dateStr: string; box: BoxItem }> = [];
  for (let i = 0; i < boxes.length; i++) {
    if (consumed.has(i)) continue;
    const d = normalizeDate(boxes[i].text);
    if (d) {
      candidateDates.push({ idx: i, dateStr: d, box: boxes[i] });
    }
  }

  const assignNearestDate = (label: BoxItem | null, fieldKey: "dateOfBirth" | "dateOfIssue" | "dateOfExpiry") => {
    if (!label || parsed[fieldKey] || candidateDates.length === 0) return;
    let bestIdx = -1;
    let bestDist = Infinity;
    let bestDate = "";
    let bestListPos = -1;

    for (let pos = 0; pos < candidateDates.length; pos++) {
      const { idx, dateStr, box } = candidateDates[pos];
      const isSpatial = box.isBelow(label) || box.isToTheRight(label);
      let dist = box.distanceFrom(label);
      if (isSpatial) dist *= 0.5;

      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
        bestDate = dateStr;
        bestListPos = pos;
      }
    }

    if (bestIdx !== -1) {
      parsed[fieldKey] = bestDate;
      consumed.add(bestIdx);
      candidateDates.splice(bestListPos, 1);
    }
  };

  assignNearestDate(dobLabel, "dateOfBirth");
  assignNearestDate(doiLabel, "dateOfIssue");
  assignNearestDate(doeLabel, "dateOfExpiry");

  // 3. Gender
  let genderLabel: BoxItem | null = null;
  for (let i = 0; i < boxes.length; i++) {
    if (consumed.has(i)) continue;
    const lower = boxes[i].text.toLowerCase();
    if (lower.startsWith("gender") || lower === "sex") {
      const parts = boxes[i].text.split(/[:\-]/);
      if (parts.length > 1 && parts[1].trim()) {
        const g = normalizeGender(parts[1].trim());
        if (g) {
          parsed.gender = g;
          consumed.add(i);
          break;
        }
      }
      genderLabel = boxes[i];
    }
  }

  if (!parsed.gender && genderLabel) {
    let bestGender: "Male" | "Female" | "" = "";
    let bestDist = Infinity;
    let bestIdx = -1;

    for (let i = 0; i < boxes.length; i++) {
      if (consumed.has(i)) continue;
      const lower = boxes[i].text.toLowerCase().trim();
      if (lower === "m" || lower === "male" || lower === "f" || lower === "female") {
        if (boxes[i].isBelow(genderLabel) || boxes[i].isToTheRight(genderLabel)) {
          const dist = boxes[i].distanceFrom(genderLabel);
          if (dist < bestDist) {
            bestDist = dist;
            bestGender = normalizeGender(lower);
            bestIdx = i;
          }
        }
      }
    }

    if (bestGender && bestIdx !== -1) {
      parsed.gender = bestGender;
      consumed.add(bestIdx);
    }
  }

  // Fallback gender from CNIC last digit
  if (!parsed.gender && parsed.cnicNumber) {
    const lastChar = parsed.cnicNumber.slice(-1);
    if (/\d/.test(lastChar)) {
      parsed.gender = parseInt(lastChar, 10) % 2 !== 0 ? "Male" : "Female";
    }
  }

  // 4. Father / Husband Name
  let fatherLabel: BoxItem | null = null;
  for (let i = 0; i < boxes.length; i++) {
    if (consumed.has(i)) continue;
    const lower = boxes[i].text.toLowerCase().trim();
    if ((lower.includes("father") || lower.includes("husband")) && !fatherLabel) {
      const parts = boxes[i].text.split(/[:\-]/);
      if (parts.length > 1 && isNameCandidate(parts[1].trim())) {
        parsed.fatherHusbandName = parts[1].trim();
        consumed.add(i);
        break;
      }
      fatherLabel = boxes[i];
    }
  }

  if (!parsed.fatherHusbandName && fatherLabel) {
    let bestName = "";
    let bestDist = Infinity;
    let bestIdx = -1;

    for (let i = 0; i < boxes.length; i++) {
      if (consumed.has(i)) continue;
      if (isNameCandidate(boxes[i].text)) {
        if (boxes[i].isBelow(fatherLabel) || boxes[i].isToTheRight(fatherLabel)) {
          const dist = boxes[i].distanceFrom(fatherLabel);
          if (dist < bestDist) {
            bestDist = dist;
            bestName = boxes[i].text.trim();
            bestIdx = i;
          }
        }
      }
    }

    if (bestName && bestIdx !== -1) {
      parsed.fatherHusbandName = bestName;
      consumed.add(bestIdx);
    }
  }

  // 5. Full Name
  let nameLabel: BoxItem | null = null;
  for (let i = 0; i < boxes.length; i++) {
    if (consumed.has(i)) continue;
    const lower = boxes[i].text.toLowerCase().trim();
    if (
      (lower === "name" || lower === "name:" || lower.startsWith("name ") || lower.startsWith("full name")) &&
      !lower.includes("father") &&
      !lower.includes("husband") &&
      !lower.includes("identity") &&
      !nameLabel
    ) {
      const parts = boxes[i].text.split(/[:\-]/);
      if (parts.length > 1 && isNameCandidate(parts[1].trim())) {
        parsed.fullName = parts[1].trim();
        consumed.add(i);
        break;
      }
      nameLabel = boxes[i];
    }
  }

  if (!parsed.fullName && nameLabel) {
    let bestName = "";
    let bestDist = Infinity;
    let bestIdx = -1;

    for (let i = 0; i < boxes.length; i++) {
      if (consumed.has(i)) continue;
      if (isNameCandidate(boxes[i].text)) {
        if (boxes[i].isBelow(nameLabel) || boxes[i].isToTheRight(nameLabel)) {
          const dist = boxes[i].distanceFrom(nameLabel);
          if (dist < bestDist) {
            bestDist = dist;
            bestName = boxes[i].text.trim();
            bestIdx = i;
          }
        }
      }
    }

    if (bestName && bestIdx !== -1) {
      parsed.fullName = bestName;
      parsed.name = bestName;
      consumed.add(bestIdx);
    }
  }

  // Synchronize aliases
  parsed.name = parsed.name || parsed.fullName || "";
  parsed.fullName = parsed.name;
  parsed.fatherName = parsed.fatherName || parsed.fatherHusbandName || "";
  parsed.fatherHusbandName = parsed.fatherName;
  parsed.cnic = parsed.cnic || parsed.cnicNumber || "";
  parsed.cnicNumber = parsed.cnic;

  return parsed;
}

/**
 * Represents the extracted data from a Driving License Sindh (DLS) card.
 * Strictly contains the 8 essential fields (no addresses, signatures, or photos):
 * 1. License No. (licenseNumber)
 * 2. Full Name (fullName)
 * 3. Father / Husband Name (fatherHusbandName)
 * 4. Date of Birth (dateOfBirth)
 * 5. Category (category)
 * 6. Issue Date (issueDate)
 * 7. Valid Upto (validUpto)
 * 8. Licensing Authority (licensingAuthority)
 */
export interface DlsData {
  licenseNumber: string;
  fullName: string;
  fatherHusbandName: string;
  dateOfBirth: string;
  category: string;
  issueDate: string;
  validUpto: string;
  licensingAuthority: string;
}

export type DocumentType = "cnic" | "dls";

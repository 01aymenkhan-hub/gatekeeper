'use client';

import React, { createContext, useContext, useState } from 'react';

export type Language = 'ur' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const TRANSLATIONS: Record<string, Record<Language, string>> = {
  // App & Branding
  app_title: { en: 'Gate Keeper', ur: 'گیٹ کیپر' },
  app_subtitle: { en: 'Enterprise Visitor & Gate Access Control System', ur: 'سیکیورٹی اور وزیٹر رسائی کنٹرول سسٹم' },

  // Gate Control
  active_gate: { en: 'Active Gate', ur: 'موجودہ گیٹ' },
  all_gates: { en: 'All Gates', ur: 'تمام گیٹس' },
  select_gate: { en: 'Select Gate', ur: 'گیٹ منتخب کریں' },
  switch_gate: { en: 'Switch Active Gate', ur: 'گیٹ تبدیل کریں' },
  gate_control_dashboard: { en: 'Gate Control Dashboard', ur: 'گیٹ کنٹرول ڈیش بورڈ' },
  gate_control_subtitle: {
    en: 'Live visitor tracking, instant CNIC & Driving License OCR check-in, and security access logs.',
    ur: 'لائیو وزیٹر ٹریکنگ، شناختی کارڈ اور ڈرائیونگ لائسنس اندراج، اور سیکیورٹی لاگز۔',
  },

  // Main Action Tiles
  register_visitor: { en: 'Register Visitor', ur: 'نیا وزیٹر درج کریں' },
  register_visitor_desc: { en: 'CNIC / DLS OCR Check-in', ur: 'شناختی کارڈ یا لائسنس اسکین' },
  checkout_visitor: { en: 'Check Out Visitor', ur: 'وزیٹر کی چھٹی کریں' },
  checkout_visitor_desc: { en: 'Scan QR or enter pass', ur: 'کیو آر کوڈ یا پاس سے باہر بھیجیں' },
  check_status: { en: 'Check Visitor Status', ur: 'وزیٹر کی تفصیل دیکھیں' },
  check_status_desc: { en: 'Search badge or phone', ur: 'نام، کارڈ یا فون سے تلاش کریں' },
  add_vendor: { en: 'Add Vendor', ur: 'وینڈر درج کریں' },
  add_vendor_desc: { en: 'Supplies & contractors', ur: 'سامان یا ٹھیکیدار کی انٹری' },

  // Action Buttons
  add_visitor_btn: { en: '+ Add Visitor', ur: '+ نیا وزیٹر' },
  checkout_btn: { en: 'Check Out', ur: 'چھٹی کریں' },
  status_btn: { en: 'Check Status', ur: 'تفصیل دیکھیں' },
  vendor_btn: { en: '+ Vendor', ur: '+ وینڈر' },
  view_pass: { en: 'View Pass', ur: 'پاس دیکھیں' },
  view_all: { en: 'View All', ur: 'سب دیکھیں' },
  close: { en: 'Close', ur: 'بند کریں' },
  retry: { en: 'Retry', ur: 'دوبارہ کوشش کریں' },

  // Dashboard KPI Statistics
  total_visitors_today: { en: 'Total Visitors Today', ur: 'آج کے کل وزیٹرز' },
  currently_inside: { en: 'Currently Inside', ur: 'اس وقت اندر موجود' },
  currently_inside_facility: { en: 'Currently Inside Facility', ur: 'عمارت کے اندر موجود افراد' },
  total_checkouts: { en: 'Total Check-Outs', ur: 'کل چھٹی (باہر گئے)' },
  overstay_alerts: { en: 'Overstay Alerts (>8h)', ur: 'وقت سے زیادہ اندر موجود (>8 گھنٹے)' },
  vendors: { en: 'Vendors', ur: 'وینڈرز' },
  interviews: { en: 'Interviews', ur: 'انٹرویو والے' },
  special_guests: { en: 'Special Guests', ur: 'خاص مہمان' },
  contractors: { en: 'Contractors', ur: 'ٹھیکیدار / ورکرز' },
  deliveries: { en: 'Deliveries', ur: 'ڈلیوری والے' },
  live_indicator: { en: 'Live', ur: 'لائیو' },
  active_on_site: { en: 'Active on site', ur: 'گیٹ کے اندر موجود' },
  exited_premises: { en: 'Exited premises', ur: 'باہر جا چکے ہیں' },
  flagged_badges: { en: 'Flagged badges', ur: 'الرٹ کارڈز' },

  // Table Headers
  visitor: { en: 'Visitor', ur: 'وزیٹر کا نام' },
  category: { en: 'Category', ur: 'قسم' },
  host_and_dept: { en: 'Host & Department', ur: 'میزبان اور شعبہ' },
  card_badge: { en: 'Card / Badge', ur: 'پاس / کارڈ نمبر' },
  entry_time: { en: 'Entry Time', ur: 'داخلے کا وقت' },
  exit_time: { en: 'Exit Time', ur: 'باہر جانے کا وقت' },
  actions: { en: 'Action', ur: 'کارروائی' },
  status: { en: 'Status', ur: 'حالت' },

  // Currently Inside Section
  real_time_occupancy: { en: 'Real-time occupancy', ur: 'موجودہ تعداد' },
  no_visitors_inside: { en: 'No visitors currently inside the facility.', ur: 'اس وقت عمارت کے اندر کوئی وزیٹر موجود نہیں ہے۔' },
  recent_activity: { en: 'Recent Activity', ur: 'حالیہ نقل و حرکت' },
  no_activity_today: { en: 'No activity recorded today yet.', ur: 'آج کی کوئی سرگرمی ریکارڈ نہیں ہوئی۔' },

  // Header & Profile / Logout
  operator_profile: { en: 'Operator Profile', ur: 'آپریٹر پروفائل' },
  operator_number: { en: 'Operator ID', ur: 'آپریٹر نمبر' },
  role_operator: { en: 'Security Operator', ur: 'سیکیورٹی آپریٹر' },
  role_admin: { en: 'Administrator', ur: 'ایڈمنسٹریٹر' },
  logout: { en: 'Logout', ur: 'لاگ آؤٹ' },
  exit_checkpoint: { en: 'Exit', ur: 'چھٹی' },
  confirm_logout: { en: 'Are you sure you want to log out of the checkpoint?', ur: 'کیا آپ واقعی اس گیٹ سے لاگ آؤٹ کرنا چاہتے ہیں؟' },
  switch_theme: { en: 'Switch Theme', ur: 'تھیم تبدیل کریں' },
  switch_language: { en: 'Language', ur: 'زبان' },

  // Operator QR Login Screen & Scanner
  operator_login_title: { en: 'Operator Login', ur: 'آپریٹر لاگ ان' },
  operator_login_subtitle: {
    en: 'Scan your physical Operator Access Card to open your checkpoint dashboard',
    ur: 'ڈیش بورڈ کھولنے کے لیے اپنا آپریٹر کارڈ اسکین کریں',
  },
  auth_failed_title: { en: 'Authentication Failed', ur: 'لاگ ان نہیں ہو سکا' },
  auth_failed_default: {
    en: 'Login verification failed. Please scan your card again.',
    ur: 'آپریٹر کارڈ کی تصدیق نہیں ہو سکی۔ براہ کرم دوبارہ اسکین کریں۔',
  },
  scan_your_qr_code: { en: 'Scan Your QR Code', ur: 'اپنا کیو آر کارڈ اسکین کریں' },
  tap_to_open_camera: { en: 'Tap anywhere to open camera', ur: 'کیمرہ کھولنے کے لیے یہاں دبائیں' },
  instant_mobile_login: {
    en: 'Instant mobile login • No password required',
    ur: 'فوری موبائل لاگ ان • پاس ورڈ کی ضرورت نہیں',
  },
  login_footer: {
    en: 'Gate Keeper v2.0 • Checkpoint Access Control',
    ur: 'گیٹ کیپر v2.0 • سیکیورٹی چیک پوائنٹ سسٹم',
  },
  starting_camera: { en: 'Starting Camera...', ur: 'کیمرہ کھل رہا ہے...' },
  qr_code_detected: { en: 'QR Code Detected', ur: 'کیو آر کوڈ اسکین ہو گیا' },
  verifying_credentials: {
    en: 'Verifying Operator Credentials...',
    ur: 'آپریٹر کارڈ کی تصدیق ہو رہی ہے...',
  },
  camera_access_error: { en: 'Camera Access Error', ur: 'کیمرہ چلنے میں مسئلہ' },
  camera_permission_denied: {
    en: 'Camera access denied. Please enable camera permission in your mobile browser.',
    ur: 'کیمرہ کی اجازت نہیں ملی۔ براہ کرم موبائل براؤزر میں کیمرہ آن کریں۔',
  },
  camera_unavailable: {
    en: 'Camera is currently unavailable. Ensure no other app is using it.',
    ur: 'کیمرہ دستیاب نہیں ہے۔ یقینی بنائیں کہ کوئی دوسری ایپ کیمرہ استعمال نہ کر رہی ہو۔',
  },
  retry_camera: { en: 'Retry Camera', ur: 'دوبارہ کیمرہ چلائیں' },
  position_qr_in_frame: {
    en: 'Position your Operator QR Card in the center frame',
    ur: 'اپنا آپریٹر کیو آر کارڈ درمیانی خانے کے سامنے رکھیں',
  },
  flip_camera: { en: 'Flip Camera', ur: 'کیمرہ تبدیل کریں' },
  cancel_scan: { en: 'Cancel Scan', ur: 'اسکین بند کریں' },
  theme_light: { en: 'Light', ur: 'لائٹ' },
  theme_dark: { en: 'Dark', ur: 'ڈارک' },
  visiting_host: { en: 'Visiting', ur: 'ملاقات:' },
  gate_label: { en: 'Gate', ur: 'گیٹ' },
  gate_prefix: { en: 'Gate', ur: 'گیٹ' },
  card_label: { en: 'Card', ur: 'کارڈ' },
  check_in_badge: { en: 'CHECK-IN', ur: 'انٹری' },
  check_out_badge: { en: 'CHECK-OUT', ur: 'چھٹی' },
  no_records_hint: {
    en: 'Try searching with a different visitor name, CNIC number, badge, or changing the status filter.',
    ur: 'کسی دوسرے نام، شناختی کارڈ نمبر، یا پاس نمبر سے تلاش کریں۔',
  },

  // Modals & Search
  search_placeholder: {
    en: 'Search by visitor name, CNIC, pass number, or phone...',
    ur: 'نام، شناختی کارڈ، پاس نمبر یا فون سے تلاش کریں...',
  },
  filter_all: { en: 'All', ur: 'تمام' },
  filter_inside: { en: 'Inside', ur: 'اندر موجود' },
  filter_checked_out: { en: 'Checked Out', ur: 'باہر گئے' },
  filter_overstay: { en: 'Overstay', ur: 'وقت سے زیادہ' },
  loading_records: { en: 'Loading records...', ur: 'ریکارڈز لوڈ ہو رہے ہیں...' },
  no_records_found: { en: 'No matching records found.', ur: 'کوئی ریکارڈ نہیں ملا۔' },
  total_records: { en: 'Total Records', ur: 'کل ریکارڈز' },
  showing: { en: 'Showing', ur: 'دکھا رہے ہیں' },
  page: { en: 'Page', ur: 'صفحہ' },
  previous: { en: 'Previous', ur: 'پچھلا' },
  next: { en: 'Next', ur: 'اگلا' },

  // ── Operator Registration Workflow (6 Steps + Final Success Screen) ──
  new_checkin_title: { en: 'New Check-In Registration', ur: 'نئی انٹری رجسٹریشن' },
  step_progress_label: { en: 'Step', ur: 'مرحلہ' },

  // Step Headings & Core Navigation Buttons (Exact Required Labels)
  select_category_title: { en: 'Select Visitor Category', ur: 'وزیٹر کی قسم منتخب کریں' },
  visit_info_title: { en: 'Visit Information', ur: 'وزٹ کی معلومات' },
  scan_id_card_title: { en: 'Scan ID Card', ur: 'شناختی کارڈ اسکین کریں' },
  scan_complete_status: { en: 'Scan Complete', ur: 'اسکین مکمل ہوگیا' },
  scan_complete_line: { en: '✓ Scan Complete', ur: '✓ اسکین مکمل ہوگیا' },
  review_scanned_details_title: { en: 'Review Scanned Details', ur: 'اسکین کی گئی معلومات دیکھیں' },
  capture_visitor_photo: { en: 'Capture Visitor Photo', ur: 'وزیٹر کی تصویر لیں' },
  registration_details_title: { en: 'Registration Details', ur: 'رجسٹریشن کی معلومات' },
  back_btn: { en: 'Back', ur: 'پیچھے جائیں' },
  continue_btn: { en: 'Continue', ur: 'جاری رکھیں' },
  submit_registration_btn: { en: 'Submit Registration', ur: 'رجسٹریشن مکمل کریں' },
  print_badge_btn: { en: 'Print Badge', ur: 'بیج پرنٹ کریں' },
  view_card_btn: { en: 'View Card', ur: 'کارڈ دیکھیں' },

  // Step 1: Select Visitor Category
  select_category_subtitle: {
    en: 'Tap a category card to continue automatically',
    ur: 'آگے بڑھنے کے لیے وزیٹر کی قسم پر ٹیپ کریں',
  },
  cat_visitor: { en: 'Visitor', ur: 'عام وزیٹر' },
  cat_vendor: { en: 'Vendor', ur: 'وینڈر / سپلائر' },
  cat_interview: { en: 'Interview', ur: 'انٹرویو امیدوار' },
  cat_special_guest: { en: 'Special Guest', ur: 'خاص مہمان' },
  cat_contractor: { en: 'Contractor', ur: 'ٹھیکیدار / ورکر' },
  cat_delivery: { en: 'Delivery', ur: 'ڈلیوری / کوریئر' },

  // Step 2: Visit Information
  visit_info_subtitle: {
    en: 'Select who the visitor is meeting and their department',
    ur: 'میزبان کا نام اور شعبہ منتخب کریں',
  },
  meet_name_label: { en: 'Visitor to Meet', ur: 'کس سے ملنا ہے (میزبان کا نام)' },
  meet_name_placeholder: {
    en: 'Search or enter host name (e.g. Muhammad Asif)',
    ur: 'میزبان کا نام تلاش کریں یا لکھیں (مثلاً محمد آصف)',
  },
  department_label: { en: 'Department', ur: 'شعبہ (ڈیپارٹمنٹ)' },
  department_placeholder: {
    en: 'Or type another department...',
    ur: 'یا کوئی اور شعبہ یہاں لکھیں...',
  },
  missing_meet_name_hint: {
    en: 'Please enter or select Visitor to Meet',
    ur: 'براہ کرم میزبان کا نام منتخب کریں یا لکھیں',
  },
  missing_department_hint: {
    en: 'Please select a Department to continue',
    ur: 'آگے بڑھنے کے لیے شعبہ منتخب کریں',
  },
  dept_accounts: { en: 'Accounts', ur: 'اکاؤنٹس' },
  dept_production: { en: 'Production', ur: 'پروڈکشن' },
  dept_it: { en: 'IT', ur: 'آئی ٹی' },
  dept_admin: { en: 'Admin', ur: 'ایڈمن' },
  dept_operations: { en: 'Operations', ur: 'آپریشنز' },
  dept_procurement: { en: 'Procurement', ur: 'پروکیورمنٹ' },
  dept_supply_chain: { en: 'Supply Chain', ur: 'سپلائی چین' },
  dept_executive_office: { en: 'Executive Office', ur: 'ایگزیکٹو آفس' },
  dept_hr: { en: 'HR', ur: 'ایچ آر' },

  // Step 3: Scan ID Card
  choose_id_scan_title: {
    en: 'Scan ID Card',
    ur: 'شناختی کارڈ اسکین کریں',
  },
  choose_id_scan_subtitle: {
    en: 'Tap a card below to open the camera and scan the visitor ID',
    ur: 'کیمرہ کھولنے اور کارڈ اسکین کرنے کے لیے نیچے بٹن دبائیں',
  },
  scan_cnic_title: { en: 'Scan CNIC', ur: 'شناختی کارڈ اسکین کریں' },
  scan_cnic_subtitle: {
    en: 'Pakistani Smart Card or NADRA CNIC',
    ur: 'پاکستانی شناختی کارڈ کی تصویر لیں',
  },
  scan_dls_title: { en: 'Scan Driving Licence', ur: 'ڈرائیونگ لائسنس اسکین کریں' },
  scan_dls_subtitle: {
    en: 'Driving Licence Card',
    ur: 'ڈرائیونگ لائسنس کی تصویر لیں',
  },
  ocr_scanning_title: { en: 'Reading Card Details...', ur: 'کارڈ پڑھا جا رہا ہے...' },
  ocr_scanning_subtitle: {
    en: 'Please wait a moment while OCR extracts the information',
    ur: 'براہ کرم انتظار کریں، کارڈ سے معلومات نکالی جا رہی ہیں',
  },
  scan_failed_title: {
    en: 'Scan failed. Please scan again.',
    ur: 'اسکین نہیں ہوا، دوبارہ اسکین کریں۔',
  },
  scan_failed_subtitle: {
    en: 'Hold the card steady in good light inside the frame and try again.',
    ur: 'کارڈ کو روشنی میں سیدھا رکھ کر دوبارہ تصویر لیں۔',
  },
  scan_again_btn: { en: 'Scan Again', ur: 'دوبارہ اسکین کریں' },

  // Step 4: Review Scanned Details
  scan_success_badge: { en: '✓ Scan Complete', ur: '✓ اسکین مکمل ہوگیا' },
  rescan_card_btn: { en: 'Rescan Card', ur: 'دوبارہ اسکین کریں' },
  extracted_cnic_title: { en: 'Extracted CNIC Information', ur: 'شناختی کارڈ کی معلومات' },
  extracted_dls_title: { en: 'Driving Licence Information', ur: 'ڈرائیونگ لائسنس کی معلومات' },
  field_full_name: { en: 'Full Name', ur: 'پورا نام' },
  field_father_husband_name: { en: 'Father / Husband Name', ur: 'والد / شوہر کا نام' },
  field_cnic_number: { en: 'CNIC Number', ur: 'شناختی کارڈ نمبر' },
  field_gender: { en: 'Gender', ur: 'جنس' },
  field_gender_select: { en: 'Select Gender', ur: 'جنس منتخب کریں' },
  field_gender_male: { en: 'Male', ur: 'مرد (Male)' },
  field_gender_female: { en: 'Female', ur: 'خاتون (Female)' },
  field_dob: { en: 'Date of Birth', ur: 'تاریخ پیدائش' },
  field_issue_date: { en: 'Date of Issue', ur: 'تاریخ اجراء' },
  field_expiry_date: { en: 'Date of Expiry', ur: 'تاریخ تنسیخ' },
  field_identification: { en: 'Identification Mark', ur: 'شناختی علامت' },
  field_license_no: { en: 'Licence Number', ur: 'لائسنس نمبر' },
  field_license_category: { en: 'Vehicle Category', ur: 'گاڑی کی قسم' },
  field_valid_upto: { en: 'Valid Upto', ur: 'میعاد ختم ہونے کی تاریخ' },
  field_licensing_authority: { en: 'Licensing Authority', ur: 'جاری کرنے والا ادارہ' },

  // Step 5: Capture Visitor Photo
  host_summary_label: { en: 'Visitor to Meet', ur: 'میزبان' },
  dept_label: { en: 'Dept', ur: 'شعبہ' },
  cnic_title: { en: 'Pakistani CNIC', ur: 'شناختی کارڈ' },
  dls_title: { en: 'Driving Licence', ur: 'ڈرائیونگ لائسنس' },
  visitor_photo_title: { en: 'Capture Visitor Photo', ur: 'وزیٹر کی تصویر لیں' },
  capture_visitor_photo_sub: {
    en: 'Tap below to open camera and take a clear photo of the visitor',
    ur: 'کیمرہ کھولنے اور وزیٹر کی صاف تصویر لینے کے لیے یہاں دبائیں',
  },
  photo_required_badge: { en: 'Required', ur: 'ضروری ہے' },
  photo_attached_badge: { en: 'Photo Attached ✓', ur: 'تصویر لگ گئی ✓' },
  capture_photo_btn: { en: 'Capture Photo', ur: 'تصویر لیں' },
  retake_photo_btn: { en: 'Retake Photo', ur: 'دوبارہ تصویر لیں' },
  photo_confirmed_title: { en: 'Visitor Photo Captured', ur: 'وزیٹر کی تصویر محفوظ ہو گئی' },

  // Step 6: Registration Details
  phone_number_label: { en: 'Phone Number', ur: 'موبائل فون نمبر' },
  phone_number_hint: {
    en: '11-digit mobile number starting with 03 (e.g. 03001234567)',
    ur: '03 سے شروع ہونے والا 11 ہندسوں کا نمبر لکھیں (مثلاً 03001234567)',
  },
  phone_number_error: {
    en: 'Please enter a valid 11-digit mobile number starting with 03.',
    ur: 'براہ کرم 03 سے شروع ہونے والا مکمل 11 ہندسوں کا نمبر درج کریں۔',
  },
  visitor_card_no_label: { en: 'Visitor Card Number', ur: 'وزیٹر کارڈ نمبر' },
  visitor_card_no_hint: {
    en: 'Enter the physical card number handed to the visitor (e.g. VC-12)',
    ur: 'وزیٹر کو دیے جانے والے کارڈ پر لکھا ہوا نمبر درج کریں (مثلاً VC-12)',
  },
  visitor_card_no_placeholder: { en: 'e.g. VC-12 or 104', ur: 'مثلاً VC-12 یا 104' },
  visitor_card_already_assigned: {
    en: 'This card is already assigned. Please choose another available card.',
    ur: 'یہ کارڈ پہلے سے استعمال میں ہے، دوسرا دستیاب کارڈ منتخب کریں۔',
  },
  visitor_card_available_badge: {
    en: 'Assigned Physical Card:',
    ur: 'جاری کردہ کارڈ نمبر:',
  },
  carrying_items_title: { en: 'Carrying Items', ur: 'ساتھ لایا گیا سامان' },
  optional_badge: { en: 'Optional', ur: 'اختیاری' },
  carrying_items_subtitle: {
    en: 'Turn on if the visitor has a laptop, bag, or tools',
    ur: 'اگر وزیٹر کے پاس لیپ ٹاپ، بیگ یا اوزار ہیں تو آن کریں',
  },
  list_carried_items_label: {
    en: 'List Carried Items',
    ur: 'سامان کی تفصیل لکھیں',
  },
  carried_items_placeholder: {
    en: 'e.g. Laptop, Backpack, Tool Kit',
    ur: 'مثلاً لیپ ٹاپ، بیگ، ٹول کٹ',
  },
  submitting_btn: { en: 'Submitting...', ur: 'محفوظ ہو رہا ہے...' },
  submitted_btn: { en: 'Submitted ✓', ur: 'مکمل ہو گیا ✓' },
  try_again_btn: { en: 'Try Again', ur: 'دوبارہ کوشش کریں' },

  // Step 7: Final Registration Success Screen & Checkout Notice
  reg_success_title: {
    en: 'Registration Successful',
    ur: 'وزیٹر رجسٹریشن مکمل ہو گئی',
  },
  reg_success_subtitle: {
    en: 'Visitor entry is registered. Hand over the physical card and print the badge.',
    ur: 'وزیٹر کا اندراج ہو گیا ہے۔ کارڈ حوالے کریں اور بیج پرنٹ کریں۔',
  },
  reg_visitor_name: { en: 'Visitor Name', ur: 'وزیٹر کا نام' },
  reg_card_badge_no: { en: 'Visitor Card #', ur: 'وزیٹر کارڈ نمبر' },
  reg_visit_to: { en: 'Visit To', ur: 'ملاقات' },
  reg_entry_gate: { en: 'Entry Gate', ur: 'انٹری گیٹ' },
  register_next_visitor_btn: { en: '+ Register Next Visitor', ur: '+ اگلا وزیٹر درج کریں' },
  collect_physical_card_label: {
    en: 'Collect Physical Visitor Card:',
    ur: 'وزیٹر سے یہ کارڈ واپس لیں:',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'ur',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Urdu is the primary default language
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gk_lang') as Language | null;
      if (saved === 'en' || saved === 'ur') {
        return saved;
      }
    }
    return 'ur';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('gk_lang', lang);
  };

  const toggleLanguage = () => {
    const next: Language = language === 'ur' ? 'en' : 'ur';
    setLanguage(next);
  };

  const t = (key: string, fallback?: string): string => {
    const dict = TRANSLATIONS[key];
    if (dict && dict[language]) {
      return dict[language];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

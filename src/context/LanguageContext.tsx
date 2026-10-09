'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

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

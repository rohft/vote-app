import React, { createContext, useContext, useState, useCallback } from 'react';

type Language = 'ne' | 'en';

interface Translations {
  [key: string]: { ne: string; en: string };
}

const translations: Translations = {
  appTitle: { ne: 'मतदाता डाटा व्यवस्थापन प्रणाली', en: 'Voter Data Management System' },
  dashboard: { ne: 'ड्यासबोर्ड', en: 'Dashboard' },
  municipalities: { ne: 'नगरपालिकाहरू', en: 'Municipalities' },
  createMunicipality: { ne: 'नगरपालिका सिर्जना', en: 'Create Municipality' },
  voters: { ne: 'मतदाताहरू', en: 'Voters' },
  analytics: { ne: 'विश्लेषण', en: 'Analytics' },
  settings: { ne: 'सेटिङ', en: 'Settings' },
  totalVoters: { ne: 'कुल मतदाता', en: 'Total Voters' },
  totalWards: { ne: 'कुल वडा', en: 'Total Wards' },
  totalBooths: { ne: 'कुल बुथ', en: 'Total Booths' },
  male: { ne: 'पुरुष', en: 'Male' },
  female: { ne: 'महिला', en: 'Female' },
  ward: { ne: 'वडा', en: 'Ward' },
  booth: { ne: 'बुथ', en: 'Booth' },
  search: { ne: 'खोज्नुहोस्', en: 'Search' },
  add: { ne: 'थप्नुहोस्', en: 'Add' },
  edit: { ne: 'सम्पादन', en: 'Edit' },
  delete: { ne: 'मेटाउनुहोस्', en: 'Delete' },
  save: { ne: 'सुरक्षित गर्नुहोस्', en: 'Save' },
  cancel: { ne: 'रद्द गर्नुहोस्', en: 'Cancel' },
  upload: { ne: 'अपलोड', en: 'Upload' },
  download: { ne: 'डाउनलोड', en: 'Download' },
  export: { ne: 'निर्यात', en: 'Export' },
  next: { ne: 'अर्को', en: 'Next' },
  previous: { ne: 'अघिल्लो', en: 'Previous' },
  confirm: { ne: 'पुष्टि गर्नुहोस्', en: 'Confirm' },
  step: { ne: 'चरण', en: 'Step' },
  basicInfo: { ne: 'आधारभूत जानकारी', en: 'Basic Info' },
  wardsSetup: { ne: 'वडा सेटअप', en: 'Wards Setup' },
  boothsData: { ne: 'बुथ र डाटा', en: 'Booths & Data' },
  reviewConfirm: { ne: 'समीक्षा र पुष्टि', en: 'Review & Confirm' },
  municipalityName: { ne: 'नगरपालिकाको नाम', en: 'Municipality Name' },
  totalWardCount: { ne: 'कुल वडा संख्या', en: 'Total Ward Count' },
  logo: { ne: 'लोगो', en: 'Logo' },
  genderDistribution: { ne: 'लिङ्ग वितरण', en: 'Gender Distribution' },
  ageDistribution: { ne: 'उमेर वितरण', en: 'Age Distribution' },
  surnameFrequency: { ne: 'थर वितरण', en: 'Surname Distribution' },
  noData: { ne: 'डाटा उपलब्ध छैन', en: 'No data available' },
  columnConfig: { ne: 'स्तम्भ कन्फिगरेसन', en: 'Column Configuration' },
  ethnicityMapping: { ne: 'जाति/जात/थर म्यापिङ', en: 'Ethnicity/Caste/Surname Mapping' },
  home: { ne: 'गृहपृष्ठ', en: 'Home' },
  language: { ne: 'भाषा', en: 'Language' },
  selectMunicipality: { ne: 'नगरपालिका छान्नुहोस्', en: 'Select Municipality' },
  selectWard: { ne: 'वडा छान्नुहोस्', en: 'Select Ward' },
  selectBooth: { ne: 'बुथ छान्नुहोस्', en: 'Select Booth' },
  uploadExcel: { ne: 'Excel अपलोड गर्नुहोस्', en: 'Upload Excel' },
  downloadTemplate: { ne: 'टेम्प्लेट डाउनलोड', en: 'Download Template' },
  actions: { ne: 'कार्यहरू', en: 'Actions' },
  of: { ne: 'मा', en: 'of' },
  showing: { ne: 'देखाउँदै', en: 'Showing' },
  rows: { ne: 'पङ्क्तिहरू', en: 'rows' },
  filters: { ne: 'फिल्टरहरू', en: 'Filters' },
  clearFilters: { ne: 'फिल्टर हटाउनुहोस्', en: 'Clear Filters' },
  boothCount: { ne: 'बुथ संख्या', en: 'Booth Count' },
  overview: { ne: 'सारांश', en: 'Overview' },
  print: { ne: 'प्रिन्ट', en: 'Print' },
  columns: { ne: 'स्तम्भहरू', en: 'Columns' },
  hideColumn: { ne: 'स्तम्भ लुकाउनुहोस्', en: 'Hide Column' },
  showColumn: { ne: 'स्तम्भ देखाउनुहोस्', en: 'Show Column' },
  filterBy: { ne: 'फिल्टर:', en: 'Filter by:' },
  all: { ne: 'सबै', en: 'All' },
  addColumn: { ne: 'नयाँ स्तम्भ', en: 'Add Column' },
  columnName: { ne: 'स्तम्भको नाम', en: 'Column Name' },
  columnNameEn: { ne: 'स्तम्भको नाम (English)', en: 'Column Name (English)' },
  columnType: { ne: 'स्तम्भको प्रकार', en: 'Column Type' },
  choiceOptions: { ne: 'विकल्पहरू', en: 'Choice Options' },
  addChoice: { ne: 'विकल्प थप्नुहोस्', en: 'Add Choice' },
  removeColumn: { ne: 'स्तम्भ हटाउनुहोस्', en: 'Remove Column' },
  ethnicity: { ne: 'जाति', en: 'Ethnicity' },
  caste: { ne: 'जात', en: 'Caste' },
  surname: { ne: 'थर', en: 'Surname' },
  addEthnicity: { ne: 'जाति थप्नुहोस्', en: 'Add Ethnicity' },
  addCaste: { ne: 'जात थप्नुहोस्', en: 'Add Caste' },
  addSurname: { ne: 'थर थप्नुहोस्', en: 'Add Surname' },
  bulkAssign: { ne: 'बल्क असाइन', en: 'Bulk Assign' },
  bulkAssignDesc: { ne: 'यो थर भएका सबै मतदातालाई जात/जाति असाइन गर्नुहोस्', en: 'Assign caste/ethnicity to all voters with this surname' },
  mobileWithFlag: { ne: '🇳🇵 +977', en: '🇳🇵 +977' },
  familyDetection: { ne: 'परिवार पहिचान', en: 'Family Detection' },
  detectFamilies: { ne: 'परिवार पहिचान गर्नुहोस्', en: 'Detect Families' },
  uploadMapping: { ne: 'म्यापिङ अपलोड', en: 'Upload Mapping' },
  bulkUpload: { ne: 'बल्क अपलोड', en: 'Bulk Upload' },
  downloadMapping: { ne: 'म्यापिङ डाउनलोड', en: 'Download Mapping' },
  voterRecord: { ne: 'मतदाता रेकर्ड', en: 'Voter Record' },
  close: { ne: 'बन्द', en: 'Close' },
  compact: { ne: 'कम्प्याक्ट', en: 'Compact' },
  fitContent: { ne: 'सामग्री अनुसार', en: 'Fit Content' },
  textAlign: { ne: 'पाठ पङ्क्तिबद्धता', en: 'Text Alignment' },
  align: { ne: 'पङ्क्तिबद्ध गर्नुहोस्', en: 'Align' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = useCallback((key: string): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[language];
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};

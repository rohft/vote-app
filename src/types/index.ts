export interface Voter {
  id: string;
  voterSerialNo: number;
  name: string;
  surname: string;
  voterIdNo: string;
  gender: string;
  age: number;
  spouseName: string;
  parentsName: string;
  caste: string;
  ethnicity: string;
  mobileNumber: string;
  email: string;
  occupation: string;
  locality: string;
  party: string;
  status: string;
  family: string;
  note: string;
  [key: string]: string | number; // for custom columns
}

export interface ColumnConfig {
  key: string;
  labelNe: string;
  labelEn: string;
  type: 'text' | 'number' | 'single-choice' | 'single-choice-logo' | 'multiple-choice' | 'phone' | 'email';
  visible: boolean;
  order: number;
  choices?: string[];
  choiceLogos?: Record<string, string>; // choice value -> logo URL
  isCustom?: boolean;
}

export interface Booth {
  id: string;
  name: string;
  nameNe: string;
  voters: Voter[];
}

export interface Ward {
  id: string;
  number: number;
  booths: Booth[];
}

export interface Municipality {
  id: string;
  name: string;
  nameNe: string;
  logo?: string;
  wards: Ward[];
}

export interface EthnicityMapping {
  ethnicity: string;
  castes: CasteMapping[];
}

export interface CasteMapping {
  caste: string;
  surnames: string[];
}

export interface LocalityWard {
  wardNumber: number;
  localities: string[];
}

export interface LocalityConfig {
  municipalityId: string;
  municipalityName: string;
  wards: LocalityWard[];
}

export const COLUMN_CONFIGS: ColumnConfig[] = [
  { key: 'voterSerialNo', labelNe: 'मतदाता क्र.सं.', labelEn: 'Voter S.N.', type: 'number', visible: true, order: 0 },
  { key: 'name', labelNe: 'नाम', labelEn: 'Name', type: 'text', visible: true, order: 1 },
  { key: 'surname', labelNe: 'थर', labelEn: 'Surname', type: 'text', visible: true, order: 2 },
  { key: 'voterIdNo', labelNe: 'मतदाता परिचयपत्र नं.', labelEn: 'Voter ID No.', type: 'text', visible: true, order: 3 },
  { key: 'gender', labelNe: 'लिङ्ग', labelEn: 'Gender', type: 'single-choice', visible: true, order: 4, choices: ['पुरुष', 'महिला', 'अन्य'] },
  { key: 'age', labelNe: 'उमेर', labelEn: 'Age', type: 'number', visible: true, order: 5 },
  { key: 'spouseName', labelNe: 'पति/पत्नीको नाम', labelEn: 'Spouse Name', type: 'text', visible: true, order: 6 },
  { key: 'parentsName', labelNe: 'आमाबुबाको नाम', labelEn: "Parents' Name", type: 'text', visible: true, order: 7 },
  { key: 'caste', labelNe: 'जात', labelEn: 'Caste', type: 'single-choice', visible: true, order: 8 },
  { key: 'ethnicity', labelNe: 'जाति', labelEn: 'Ethnicity', type: 'single-choice', visible: true, order: 9 },
  { key: 'mobileNumber', labelNe: 'मोबाइल नम्बर', labelEn: 'Mobile Number', type: 'phone', visible: true, order: 10 },
  { key: 'email', labelNe: 'इमेल', labelEn: 'Email', type: 'email', visible: true, order: 11 },
  { key: 'occupation', labelNe: 'व्यवसाय', labelEn: 'Occupation', type: 'text', visible: true, order: 12 },
  { key: 'locality', labelNe: 'टोल', labelEn: 'Locality', type: 'text', visible: true, order: 13 },
  { key: 'party', labelNe: 'पार्टि', labelEn: 'Party', type: 'single-choice', visible: true, order: 14 },
  { key: 'status', labelNe: 'स्थिति', labelEn: 'Status', type: 'single-choice', visible: true, order: 15 },
  { key: 'family', labelNe: 'परिवार', labelEn: 'Family', type: 'text', visible: true, order: 16 },
  { key: 'note', labelNe: 'नोट', labelEn: 'Note', type: 'text', visible: true, order: 17 },
];

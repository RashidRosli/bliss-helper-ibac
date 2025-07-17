export interface Helper {
  code: string;
  name: string;
  nationality: string;
  age: number;
  experience: number;
  english: string;
  height: number;
  weight: number;
  religion: string;
  education: string;
  marital: string;
  children: string;
  salary: number;
  availability: string;
  status: string;
  jobscope: string[];
  notes: string;
  focus_area: string[];
  passport_ready: boolean;
  transfer_ready: boolean;
}

export interface EmployerRequirements {
  customerName: string;
  contact: string;
  email: string; // Added new field
  referralSource: string; // Added new field
  employerRace: string; // Added new field
  jobscope: string[];
  firstTimeHelper: boolean;
  childrenAges: string[];
  elderlyRelationship: string;
  pets: string[];
  residenceType: string;
  roomSharing: boolean;
  startDate: string;
  preferences: string;
  budget: string;
  nationalityPreferences: string[]; // Changed from nationalityPreference (string) to array
  helperType: string;
  agePreference: string;
  englishRequirement: string;
  heightPreference: string;
  weightPreference: string;
  experienceTags: string[];
  religionPreference: string;
  educationRequirement: string;
  maritalPreference: string;
  helperChildrenAges: string;
  focusArea: string[];
  excludedBios: string[];
}

export interface InterviewQuestion {
  id: string;
  question: string;
  category: string;
  matchFor: string[];
  compulsory: boolean;
}

export interface MatchResult {
  helper: Helper;
  score: number;
  matches: Array<{
    criteria: string;
    status: 'match' | 'partial' | 'mismatch';
    details: string;
  }>;
}

export interface ValueContent {
  trait: string;
  value: string;
  category: string;
}
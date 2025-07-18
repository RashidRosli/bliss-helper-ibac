export interface Helper {
  "Code": string;
  "Name": string;
  "Nationality": string;
  "Age": string | number;
  "Work Experience": string;
  "Salary": string | number;
  "Availability": string;
  "Religion": string;
  "Education": string;
  "Marital Status": string;
  "Weight (Kg)": string | number;
  "Height (cm)": string | number;
  "Passport Status": string;
  "Passport Process Date"?: string;
  "Deduction"?: string;
  "Type"?: string;
  "Helper Exp."?: string;
  "Language"?: string;
  "Infant Care Work Experience YES IF 0-6m"?: string;
  "Infant Care Work Experience YES IF 7-12m"?: string;
  "Childcare Work Experience YES IF 1-3y"?: string;
  "Childcare Work Experience YES IF 4-6y"?: string;
  "Childcare Work Experience YES IF 7-12y"?: string;
  "Elderly Care Work Experience (Yes/No)"?: string;
  "Care Giver/Nursing aid Cert (Yes/No)"?: string;
  "Personal Infant Care Experience YES if have same work exp OR OWN CHILDREN <3YO"?: string;
  "Personal Childcare Experience YES if have same work exp OR OWN CHILDREN <6YO"?: string;
  "Personal Elderly Care Experience (Yes/No)"?: string;
  "No. of Child"?: string;
  "Age of Child"?: string;
  "Eat Pork"?: string;
  "Handle Pork"?: string;
  "No. of Off Day"?: string;
  "Recommendation Remarks"?: string;
  "Internal Remarks"?: string;
  "Additional Remarks"?: string;
  // ... add more as needed!
  [key: string]: any; // fallback
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
  petsRaw: string[];
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
  jobscopeLines?: string[];
  jobscopeFacts?: any;
  adults?: number;
  kids?: number;
  babies?: number;
  twins?: boolean;
  babiesEDD?: number;
  kidAges?: string[];
  elderly?: number;
  elderlyAges?: string[];
  elderlyNeeds?: string[];
  petTypes?: string[];
  specialNeeds?: string[];
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
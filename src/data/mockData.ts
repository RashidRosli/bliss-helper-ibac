import { Helper, InterviewQuestion, ValueContent } from '../types';

export const mockHelpers: Helper[] = [
  {
    code: "SG/MYA/2024001",
    name: "Thida",
    nationality: "Myanmar",
    age: 28,
    experience: 5,
    english: "Good",
    height: 155,
    weight: 50,
    religion: "Buddhist",
    education: "High School",
    marital: "Single",
    children: "None",
    salary: 650,
    availability: "Available",
    status: "Passport Ready",
    jobscope: ["housework", "cooking", "childcare", "eldercare"],
    notes: "Experienced with infant care, good with pets",
    focus_area: ["childcare", "cooking"],
    passport_ready: true,
    transfer_ready: false
  },
  {
    code: "SG/IND/2024002",
    name: "Priya",
    nationality: "India",
    age: 32,
    experience: 8,
    english: "Very Good",
    height: 160,
    weight: 55,
    religion: "Hindu",
    education: "Diploma",
    marital: "Married",
    children: "2 children (8, 10)",
    salary: 700,
    availability: "Available",
    status: "Transfer Ready",
    jobscope: ["housework", "cooking", "eldercare"],
    notes: "Specializes in elderly care, vegetarian cooking",
    focus_area: ["eldercare", "cooking"],
    passport_ready: true,
    transfer_ready: true
  },
  {
    code: "SG/PHI/2024003",
    name: "Maria",
    nationality: "Philippines",
    age: 25,
    experience: 3,
    english: "Excellent",
    height: 158,
    weight: 52,
    religion: "Catholic",
    education: "College",
    marital: "Single",
    children: "None",
    salary: 680,
    availability: "Available",
    status: "Passport Ready",
    jobscope: ["housework", "cooking", "childcare"],
    notes: "University graduate, great with children",
    focus_area: ["childcare", "tutoring"],
    passport_ready: true,
    transfer_ready: false
  },
  {
    code: "SG/MYA/2024004",
    name: "Khin",
    nationality: "Myanmar",
    age: 35,
    experience: 12,
    english: "Good",
    height: 152,
    weight: 48,
    religion: "Buddhist",
    education: "High School",
    marital: "Married",
    children: "1 child (15)",
    salary: 720,
    availability: "Available",
    status: "Transfer Ready",
    jobscope: ["housework", "cooking", "eldercare", "childcare"],
    notes: "Very experienced, excellent with difficult elderly",
    focus_area: ["eldercare", "housework"],
    passport_ready: true,
    transfer_ready: true
  },
  {
    code: "SG/IND/2024005",
    name: "Lakshmi",
    nationality: "India",
    age: 29,
    experience: 6,
    english: "Very Good",
    height: 162,
    weight: 58,
    religion: "Hindu",
    education: "High School",
    marital: "Single",
    children: "None",
    salary: 670,
    availability: "Available",
    status: "Passport Ready",
    jobscope: ["housework", "cooking", "childcare"],
    notes: "Great with toddlers, Indian and Chinese cooking",
    focus_area: ["childcare", "cooking"],
    passport_ready: true,
    transfer_ready: false
  }
];

export const mockQuestions: InterviewQuestion[] = [
  {
    id: "open1",
    question: "Can you please introduce yourself to Ma'am and Sir?",
    category: "Opening",
    matchFor: ["all"],
    compulsory: true
  },
  {
    id: "open2",
    question: "Why do you want to work in Singapore?",
    category: "Opening",
    matchFor: ["all"],
    compulsory: true
  },
  {
    id: "open3",
    question: "Are you healthy? Do you need to take medicine every day?",
    category: "Opening",
    matchFor: ["all"],
    compulsory: true
  },
  {
    id: "child1",
    question: "How do you handle crying babies?",
    category: "Childcare",
    matchFor: ["childcare", "infant"],
    compulsory: false
  },
  {
    id: "child2",
    question: "What activities do you do with young children?",
    category: "Childcare",
    matchFor: ["childcare", "toddler"],
    compulsory: false
  },
  {
    id: "elder1",
    question: "How do you assist elderly with mobility issues?",
    category: "Eldercare",
    matchFor: ["eldercare", "elderly"],
    compulsory: false
  },
  {
    id: "elder2",
    question: "What would you do if elderly refuses to eat?",
    category: "Eldercare",
    matchFor: ["eldercare", "elderly"],
    compulsory: false
  },
  {
    id: "cook1",
    question: "What type of food can you cook?",
    category: "Cooking",
    matchFor: ["cooking"],
    compulsory: false
  },
  {
    id: "cook2",
    question: "Are you comfortable learning new recipes?",
    category: "Cooking",
    matchFor: ["cooking"],
    compulsory: false
  },
  {
    id: "house1",
    question: "How do you organize your daily housework?",
    category: "Housework",
    matchFor: ["housework"],
    compulsory: false
  },
  {
    id: "house2",
    question: "How do you handle delicate items while cleaning?",
    category: "Housework",
    matchFor: ["housework"],
    compulsory: false
  },
  {
    id: "pet1",
    question: "Are you comfortable taking care of pets?",
    category: "Pet Care",
    matchFor: ["pets"],
    compulsory: false
  },
  {
    id: "close1",
    question: "Are you okay with [X] offday?",
    category: "Closing",
    matchFor: ["all"],
    compulsory: true
  },
  {
    id: "close2",
    question: "How many years do you want to work in Singapore?",
    category: "Closing",
    matchFor: ["all"],
    compulsory: true
  },
  {
    id: "close3",
    question: "Who will help to take care of your family if you are working overseas?",
    category: "Closing",
    matchFor: ["all"],
    compulsory: true
  }
];

export const mockValueContent: ValueContent[] = [
  {
    trait: "experienced",
    value: "brings peace of mind with proven track record",
    category: "experience"
  },
  {
    trait: "english_speaking",
    value: "ensures clear communication and understanding",
    category: "communication"
  },
  {
    trait: "childcare_focused",
    value: "provides nurturing care for your precious ones",
    category: "childcare"
  },
  {
    trait: "eldercare_specialist",
    value: "offers compassionate support for elderly family members",
    category: "eldercare"
  },
  {
    trait: "cooking_skills",
    value: "prepares nutritious meals your family will love",
    category: "cooking"
  },
  {
    trait: "transfer_ready",
    value: "can start immediately to meet your urgent needs",
    category: "availability"
  },
  {
    trait: "passport_ready",
    value: "ready to join your family within 1-2 months",
    category: "availability"
  },
  {
    trait: "college_educated",
    value: "brings intelligence and adaptability to your household",
    category: "education"
  },
  {
    trait: "pet_friendly",
    value: "will care for your furry family members with love",
    category: "pets"
  },
  {
    trait: "long_term_commitment",
    value: "seeks stable employment to grow with your family",
    category: "commitment"
  }
];
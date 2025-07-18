// src/utils/jobscopeParser.ts

export interface ParsedJobscopeFacts {
  adults?: number;
  kids?: number;
  kidAges?: string[];
  babies?: number;
  babiesEDD?: number; // count of 'EDD' (expected delivery date)
  twins?: boolean;
  elderly?: number;
  elderlyAges?: string[];
  elderlyNeeds?: string[];
  pets?: number;
  petTypes?: string[];
  specialNeeds?: string[];
}

export function extractJobscopeFacts(lines: string[]): ParsedJobscopeFacts {
  let facts: ParsedJobscopeFacts = {};
  let adults = 0, kids = 0, babies = 0, twins = false, elderly = 0, pets = 0;
  let kidAges: string[] = [], elderlyAges: string[] = [], petTypes: string[] = [], specialNeeds: string[] = [], elderlyNeeds: string[] = [];
  let babiesEDD = 0;

  for (let line of lines) {
    let lower = line.toLowerCase();

    // Adults
    const adultsMatch = lower.match(/(\d+)\s*adults?/);
    if (adultsMatch) adults += parseInt(adultsMatch[1]);

    // Kids/Children
    const kidsMatch = lower.match(/(\d+)\s*kids?/);
    if (kidsMatch) kids += parseInt(kidsMatch[1]);
    const childrenMatch = lower.match(/(\d+)\s*children/);
    if (childrenMatch) kids += parseInt(childrenMatch[1]);
    // Ages in text (e.g., 6yo, 7 y/o, 8 years old, 3mo)
    const kidAgeMatch = line.match(/(\d+)[ ]*(?:yo|y\/o|years? old|mo|months?)/gi);
    if (kidAgeMatch) kidAges.push(...kidAgeMatch.map(a => a.trim()));

    // Babies/Infants/Newborn
    if (/newborn|infant|baby/gi.test(lower)) {
      // Count if pattern like "2 baby" or "twins"
      const babyNumMatch = lower.match(/(\d+)\s*(?:babies|baby|newborns?|infants?)/);
      if (babyNumMatch) babies += parseInt(babyNumMatch[1]);
      else if (lower.includes("twins")) {
        twins = true; babies += 2;
      } else babies++;
    }
    if (lower.includes('edd')) babiesEDD++;

    // Elderly
    if (/elderly|ahma|grandma|ah gong|grandpa/.test(lower)) {
      const elderlyNumMatch = lower.match(/(\d+)\s*elderly/);
      if (elderlyNumMatch) elderly += parseInt(elderlyNumMatch[1]);
      else elderly++;
      // Elderly ages
      const elderlyAgeMatch = line.match(/elderly[^\d]*(\d+)\s*(yo|years? old)/i);
      if (elderlyAgeMatch) elderlyAges.push(elderlyAgeMatch[1]);
      // Special needs
      if (lower.includes('wheelchair')) elderlyNeeds.push('wheelchair');
      if (lower.includes('bedridden')) elderlyNeeds.push('bedridden');
      if (lower.includes('stroke')) elderlyNeeds.push('stroke');
      if (lower.includes('parkinson')) elderlyNeeds.push('parkinson');
      if (lower.includes('dementia')) elderlyNeeds.push('dementia');
    }

    // Pets
    if (/dog|cat|pet|rabbit|bird/.test(lower)) {
      let petNum = 1;
      const petMatch = lower.match(/(\d+)\s*(dog|cat|pet|rabbit|bird)/);
      if (petMatch) {
        petNum = parseInt(petMatch[1]);
        petTypes.push(petMatch[2]);
      }
      pets += petNum;
      if (petTypes.length === 0) {
        if (lower.includes('dog')) petTypes.push('dog');
        if (lower.includes('cat')) petTypes.push('cat');
        if (lower.includes('rabbit')) petTypes.push('rabbit');
        if (lower.includes('bird')) petTypes.push('bird');
      }
    }

    // Special Needs (autism, ADHD, twins, etc)
    if (lower.includes('autism')) specialNeeds.push('autism');
    if (lower.includes('adhd')) specialNeeds.push('adhd');
    if (lower.includes('twins')) twins = true;
  }
  if (adults) facts.adults = adults;
  if (kids) facts.kids = kids;
  if (kidAges.length) facts.kidAges = Array.from(new Set(kidAges));
  if (babies) facts.babies = babies;
  if (babiesEDD) facts.babiesEDD = babiesEDD;
  if (twins) facts.twins = true;
  if (elderly) facts.elderly = elderly;
  if (elderlyAges.length) facts.elderlyAges = elderlyAges;
  if (elderlyNeeds.length) facts.elderlyNeeds = Array.from(new Set(elderlyNeeds));
  if (pets) facts.pets = pets;
  if (petTypes.length) facts.petTypes = Array.from(new Set(petTypes));
  if (specialNeeds.length) facts.specialNeeds = Array.from(new Set(specialNeeds));
  return facts;
}

// --- Optional: Basic Tag Extraction Utility for Keywords ---
const JOBSCOPE_KEYWORDS = [
  "take care newborn", "newborn", "baby", "infant", "infant care",
  "take care child", "childcare", "child care", "kids", "children",
  "night feeding", "prepare breakfast", "prepare school bag",
  "household chores", "housework", "general housework", "cleaning",
  "cooking", "cook", "grocery shopping", "marketing", "pet care",
  "dog care", "cat care", "take care elderly", "elderly care", "assist elderly",
  "shower", "bathe", "bathing", "change diaper", "change diapers", "diaper",
  "laundry", "washing clothes", "ironing", "send child to school", "fetch child from school",
  "special needs", "autism", "adhd", "twins"
];

// Extracts all matching tags/keywords from text (returns unique array)
export function extractJobscopeTagsFromText(text: string): string[] {
  const tags: string[] = [];
  let ltext = text.toLowerCase();
  for (let keyword of JOBSCOPE_KEYWORDS) {
    // keyword must be a separate word or phrase in the text
    if (ltext.includes(keyword)) {
      tags.push(keyword);
    }
  }
  // If they wrote "pet" or "dog" or "cat"
  if (ltext.includes('dog')) tags.push('dog care');
  if (ltext.includes('cat')) tags.push('cat care');
  if (ltext.includes('pet')) tags.push('pet care');
  // Clean unique
  return Array.from(new Set(tags));
}

// --- Usage Example ---
// const lines = text.split(/[\n\r,-]+/).map(l => l.trim()).filter(Boolean);
// const facts = extractJobscopeFacts(lines);
// const tags = extractJobscopeTagsFromText(text);


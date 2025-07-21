import { EmployerRequirements } from "../types";
import { extractNationalityPrefs } from "./extractNationalityPrefs";

// --- Tag Mapping for Detection ---
const JOBSCOPE_TAGS: Record<string, string[]> = {
    "infant care": [
        "infant", "newborn", "baby", "toddler (below 1)", "take care infant", "take care baby", "caring for infant", "feeding milk", "night feeding", "feeding baby", "shower baby", "change diapers", "mainly for infantcare", "primary take care of baby", "take care newborn"
    ],
    "child care": [
        "child", "children", "kids", "childcare", "taking care of kids", "taking care children", "take care of kids", "take care of children", "toddler", "kid", "take care twins", "autism", "adhd", "twins"
    ],
    "elderly care": [
        "elderly", "elder", "ahma", "grandma", "ah gong", "grandpa", "dementia", "stroke", "parkinson", "showering elderly", "feeding elderly", "support when walking", "bring to toilet", "company to hospital", "company ah ma to grocery shopping", "provide medication", "elderly care", "mainly for elderlycare", "assist ahma walking", "change diaper", "wheelchair", "bedridden", "assist medication"
    ],
    "pet care": [
        "pet", "dog", "cat", "pets", "take care of dog", "take care of cat", "feed dog", "feed cat", "walk dog", "pet care", "small dog", "big dog", "bring for a walk", "rabbit", "birds", "terrapin"
    ],
    "cooking": [
        "cook", "cooking", "prepare food", "prepare meals", "prepare dinner", "prepare lunch", "simple cooking", "can cook", "must know cooking", "cook chinese", "cook vegetarian", "dinner menu", "prepare breakfast", "cook daily", "do simple cooking", "cook indian", "basic cooking"
    ],
    "household chores": [
        "household", "household chores", "housechores", "house work", "housework", "house cleaning", "general household chores", "cleaning", "vacuum", "mop", "ironing", "laundry", "wash car", "spring cleaning", "washing clothes", "overall maintenance", "do housechores", "clean house", "house chores", "houseworks"
    ],
    "send/fetch kids": [
        "send kid", "fetch kid", "send and fetch", "sent and fetch", "pick up kid", "pick up child", "pick up from school", "drop off", "school", "send to school", "fetch from school", "send/pick them school", "pick up from school", "fetch 7yo from school", "send and pick up from school", "pick up son"
    ],
    "marketing": [
        "marketing", "grocery shopping", "do grocery", "shopping", "grocery", "do marketing", "buying groceries", "marketingp"
    ],
    "assist/other": [
        "assist", "assist to toilet", "assist showering", "help with exercise", "help with medicine", "medicine", "injection", "company", "work with another helper", "work with other helper", "sharing room", "assist medication taking"
    ],
};
const TAGS_LIST = Object.entries(JOBSCOPE_TAGS);

// --- Normalizes Preference Remarks to Multiline Bullet Format ---
function normalizePreferenceRemarks(raw: any): string {
    if (!raw || typeof raw !== "string") return "";
    // Split by newline, dash, bullet, or line starting with whitespace+dash/•/–
    const lines = raw
        .split(/[\r\n]+|(?:^|\s)[\-•–]\s?/)
        .map(s => s.trim())
        .filter(s => !!s && s !== "-"); // skip empty or lone dash
    return lines.join('\n');
}

function extractJobscopeTagsFromText(jobscopeText: string): string[] {
    const tagsFound = new Set<string>();
    const text = jobscopeText.toLowerCase();

    for (const [tag, synonyms] of TAGS_LIST) {
        for (const syn of synonyms) {
            if (text.includes(syn)) tagsFound.add(tag);
        }
    }

    // Regex detection for special cases
    if (/autism|adhd/.test(text)) tagsFound.add("child care");
    if (/elderly|grandma|ahma|ah gong|grandpa|dementia|stroke|parkinson/.test(text)) tagsFound.add("elderly care");
    if (/dog|cat|pet|rabbit|bird/.test(text)) tagsFound.add("pet care");
    if (/cook|cooking|prepare|meal|breakfast|lunch|dinner|vegetarian|indian/.test(text)) tagsFound.add("cooking");
    if (/household|clean|chores|housework|laundry|ironing|vacuum|mop|wash|spring cleaning|maintenance/.test(text)) tagsFound.add("household chores");
    if (/send|fetch|pick up|drop off|school|bus/.test(text)) tagsFound.add("send/fetch kids");
    if (/market|grocery|shopping|buy groceries/.test(text)) tagsFound.add("marketing");

    return Array.from(tagsFound);
}

// --- Extract structured numbers & entities from jobscope ---
function extractJobscopeFacts(lines: string[]) {
    let facts: any = {};
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
        const kidAgeMatch = line.match(/(\d+)[ ]*(?:yo|y\/o|years? old|mo|months?)/gi);
        if (kidAgeMatch) kidAges.push(...kidAgeMatch.map(a => a.trim()));

        // Babies/Infants/Newborn
        if (/newborn|infant|baby/gi.test(lower)) {
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
            const elderlyAgeMatch = line.match(/elderly[^\d]*(\d+)\s*(yo|years? old)/i);
            if (elderlyAgeMatch) elderlyAges.push(elderlyAgeMatch[1]);
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

        // Special Needs
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

// --- Extract possible weight/height/age preferences from normalized preferences text ---
function extractPreferenceNumbers(preferences: string) {
    let out: { weight?: string; height?: string; age?: string } = {};
    if (!preferences) return out;

    // Find "above/below X kg"
    const weightMatch = preferences.match(/(?:above|below)\s*(\d{2,3})\s*kg/i);
    if (weightMatch) out.weight = `${weightMatch[0]}`;

    // Find "above/below X cm"
    const heightMatch = preferences.match(/(?:above|below)\s*(\d{2,3})\s*cm/i);
    if (heightMatch) out.height = `${heightMatch[0]}`;

    // Find "above/below X" (standalone, assume age if 2 digits, NOT followed by kg/cm)
    // Prefer lines that look like "above 40", "below 40", "above 35 yo", "below 30yo"
    const ageMatch = preferences.match(/(?:above|below)\s*(\d{2})\s*(?:yo|years? old)?\b(?!\s*kg|\s*cm)/i);
    if (ageMatch) out.age = `${ageMatch[0]}`;

    return out;
}

// --- Main: Smart Data Mapping ---
export function mapLookupDataToForm(data: any): Partial<EmployerRequirements> {
    // --- Smart Jobscope Handling ---
    let jobscopeText = "";
    if (data.Jobscope) {
        jobscopeText = typeof data.Jobscope === "string"
            ? data.Jobscope
            : Array.isArray(data.Jobscope) ? data.Jobscope.join("\n") : "";
    }
    if (!jobscopeText && typeof data["Preference remarks"] === "string") {
        jobscopeText = data["Preference remarks"];
    }
    const jobscopeLines = jobscopeText
        .split(/[\r\n•]+|(?:^|\s)[\-–]\s?/)
        .map(s => s.trim())
        .filter(Boolean);

    // Tag extraction (robust, finds all present tags)
    const jobscopeTags: string[] = [
        ...new Set([
            ...extractJobscopeTagsFromText(jobscopeText),
            ...jobscopeLines.flatMap(line => extractJobscopeTagsFromText(line))
        ])
    ];
    const jobscopeFacts = extractJobscopeFacts(jobscopeLines);

    // --- Preferences: normalized to multiline string
    const normalizedPreferences =
        (data["Preference remarks"] && !data.preferences)
            ? normalizePreferenceRemarks(data["Preference remarks"])
            : (data.preferences || "");

    // --- New: Extract above/below kg/cm/age
    const prefNumbers = extractPreferenceNumbers(normalizedPreferences);

    return {
        customerName: data["Name of client"] || data.customerName || "",
        contact: data.Contact || data.contact || "",
        email: data.Email || data.email || "",
        referralSource: data["How did they reach us"] || data.referralSource || "",
        employerRace: data["Employer Race"] || data.employerRace || "",
        jobscope: jobscopeTags,
        jobscopeLines,
        jobscopeFacts,
        adults: jobscopeFacts.adults,
        kids: jobscopeFacts.kids,
        babies: jobscopeFacts.babies,
        twins: jobscopeFacts.twins,
        babiesEDD: jobscopeFacts.babiesEDD,
        kidAges: jobscopeFacts.kidAges,
        elderly: jobscopeFacts.elderly,
        elderlyAges: jobscopeFacts.elderlyAges,
        elderlyNeeds: jobscopeFacts.elderlyNeeds,
        pets: jobscopeFacts.pets,
        petTypes: jobscopeFacts.petTypes,
        specialNeeds: jobscopeFacts.specialNeeds,
        firstTimeHelper:
            data["First Time Hiring"] === "yes" ||
            data.firstTimeHelper === true ||
            String(data["First Time Hiring"] || "").toLowerCase() === "true",
        childrenAges: data["Age of kids"]
            ? (typeof data["Age of kids"] === "string"
                ? data["Age of kids"].split(",").map((s: string) => s.trim()).filter(Boolean)
                : [])
            : [],
        elderlyRelationship: data["Relationship of Elderly"] || "",
        petsRaw: data.Pets
            ? (typeof data.Pets === "string"
                ? data.Pets.replace(/\r?\n/g, ',').split(",").map((s: string) => s.trim()).filter(Boolean)
                : [])
            : [],
        residenceType: data["Type of residence"] || "",
        roomSharing:
            data["Room sharing"] === "yes" ||
            data.roomSharing === true ||
            String(data["Room sharing"] || "").toLowerCase() === "true",
        startDate: data["When do you need the helper"] || "",
        // --- PREFERENCES: autofill if empty, always normalized to multiline string ---
        preferences: normalizedPreferences,
        budget: (data["Salary and palcement budget"] || "").toString(),
        nationalityPreferences: extractNationalityPrefs(
            data["Nationality preference"],
            data["Preference remarks"]
        ),
        helperType: data["Type of helper"] || "",
        // --- Autofill from preference lines if empty ---
        agePreference: data["Prefer helper age"] || prefNumbers.age || "",
        englishRequirement: data["Prefer helper English Level"] || "",
        heightPreference: data["Prefer Helper Height (cm)"] || prefNumbers.height || "",
        weightPreference: data["Prefer Helper Weight (kg)"] || prefNumbers.weight || "",
        experienceTags: data["Prefer helper experince in infant/child/elder care"]
            ? data["Prefer helper experince in infant/child/elder care"].split(",").map((s: string) => s.trim()).filter(Boolean)
            : [],
        religionPreference: data["Prefer helper Religion"] || data["Prefer helper Religion "] || "",
        educationRequirement: data["Prefer helper Education"] || "",
        maritalPreference: data["Prefer helper Marital Status"] || "",
        helperChildrenAges: data["Prefer helper Children age"] || "",
        excludedBios: data["Bio Sended"]
            ? data["Bio Sended"].split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean)
            : [],
        focusArea: [],
    };
}

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

// --- Normalize remarks to bullet format ---
function normalizePreferenceRemarks(raw: any): string {
    if (!raw || typeof raw !== "string") return "";
    const lines = raw
        .split(/[\r\n]+|(?:^|\s)[\-•–]\s?/)
        .map(s => s.trim())
        .filter(s => !!s && s !== "-");
    return lines.join('\n');
}

// --- Tag detection in jobscope/remarks text ---
function extractJobscopeTagsFromText(jobscopeText: string): string[] {
    const tagsFound = new Set<string>();
    const text = (jobscopeText || "").toLowerCase();
    for (const [tag, synonyms] of TAGS_LIST) {
        for (const syn of synonyms) {
            if (text.includes(syn)) tagsFound.add(tag);
        }
    }
    if (/autism|adhd/.test(text)) tagsFound.add("child care");
    if (/elderly|grandma|ahma|ah gong|grandpa|dementia|stroke|parkinson/.test(text)) tagsFound.add("elderly care");
    if (/dog|cat|pet|rabbit|bird/.test(text)) tagsFound.add("pet care");
    if (/cook|cooking|prepare|meal|breakfast|lunch|dinner|vegetarian|indian/.test(text)) tagsFound.add("cooking");
    if (/household|clean|chores|housework|laundry|ironing|vacuum|mop|wash|spring cleaning|maintenance/.test(text)) tagsFound.add("household chores");
    if (/send|fetch|pick up|drop off|school|bus/.test(text)) tagsFound.add("send/fetch kids");
    if (/market|grocery|shopping|buy groceries/.test(text)) tagsFound.add("marketing");
    return Array.from(tagsFound);
}

// --- Extract numbers/entities from jobscope lines ---
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

// --- Extract numbers from preferences ---
function extractPreferenceNumbers(preferences: string) {
    let out: { weight?: string; height?: string; age?: string } = {};
    if (!preferences) return out;
    const weightMatch = preferences.match(/(?:above|below)\s*(\d{2,3})\s*kg/i);
    if (weightMatch) out.weight = `${weightMatch[0]}`;
    const heightMatch = preferences.match(/(?:above|below)\s*(\d{2,3})\s*cm/i);
    if (heightMatch) out.height = `${heightMatch[0]}`;
    const ageMatch = preferences.match(/(?:above|below)\s*(\d{2})\s*(?:yo|years? old)?\b(?!\s*kg|\s*cm)/i);
    if (ageMatch) out.age = `${ageMatch[0]}`;
    return out;
}

// --- Normalize sheet header for lookup ---
function normalizeKey(key: string) {
    return key
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ""); // Remove all non-alphanumerics (spaces, _, newlines, etc)
}

// --- Get field by list of possible names (resilient to headers) ---
function getField(data: any, keys: string[], fallback: any = "") {
    if (!data || typeof data !== "object") return fallback;
    const normMap: Record<string, any> = {};
    for (const k in data) {
        if (!Object.prototype.hasOwnProperty.call(data, k)) continue;
        normMap[normalizeKey(k)] = data[k];
    }
    for (const key of keys) {
        const norm = normalizeKey(key);
        if (normMap[norm] !== undefined && normMap[norm] !== null && normMap[norm] !== "") {
            return normMap[norm];
        }
    }
    return fallback;
}

const splitToArray = (value: any) =>
    typeof value === "string"
        ? value.split(/,|\r?\n/).map((s: string) => s.trim()).filter(Boolean)
        : Array.isArray(value)
            ? value
            : [];

// --- Main mapping function: robust, supports any sheet, partial data ---
export function mapLookupDataToForm(data: any): Partial<EmployerRequirements> {
    if (!data || typeof data !== "object") return {};

    let jobscopeText =
        getField(data, ["Jobscope", "jobscope", "Job Scope", "Preference remarks"], "");
    if (Array.isArray(jobscopeText)) jobscopeText = jobscopeText.join("\n");

    const jobscopeLines = typeof jobscopeText === "string"
        ? jobscopeText
            .split(/[\r\n•]+|(?:^|\s)[\-–]\s?/)
            .map(s => s.trim())
            .filter(Boolean)
        : [];

    const jobscopeTags: string[] = [
        ...new Set([
            ...extractJobscopeTagsFromText(jobscopeText || ""),
            ...jobscopeLines.flatMap(line => extractJobscopeTagsFromText(line))
        ])
    ];
    const jobscopeFacts = extractJobscopeFacts(jobscopeLines);

    const normalizedPreferences = getField(
        data,
        ["Preference remarks", "preferences"],
        ""
    );
    const normPrefText = normalizePreferenceRemarks(normalizedPreferences);

    const prefNumbers = extractPreferenceNumbers(normPrefText);

    return {
        customerName: getField(data, ["Name of client", "customerName", "clientName", "name"]) || "",
        contact: getField(data, ["Contact", "contact", "Phone", "phone", "hp"]) || "",
        email: getField(data, ["Email", "email"]) || "",
        referralSource: getField(data, ["How did they reach us", "referralSource"]) || "",
        employerRace: getField(data, ["Employer Race", "employerRace"]) || "",
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
            getField(data, ["First Time Hiring", "firstTimeHelper"]) === "yes" ||
            getField(data, ["First Time Hiring", "firstTimeHelper"]) === true ||
            String(getField(data, ["First Time Hiring", "firstTimeHelper"]) || "").toLowerCase() === "true",
        childrenAges: splitToArray(getField(data, ["Age of kids", "childrenAges"])),
        elderlyRelationship: getField(data, ["Relationship of Elderly", "elderlyRelationship"]) || "",
        petsRaw: splitToArray(getField(data, ["Pets", "petsRaw"])),
        residenceType: getField(data, ["Type of residence", "residenceType"]) || "",
        roomSharing:
            getField(data, ["Room sharing", "roomSharing"]) === "yes" ||
            getField(data, ["Room sharing", "roomSharing"]) === true ||
            String(getField(data, ["Room sharing", "roomSharing"]) || "").toLowerCase() === "true",
        startDate: getField(data, ["When do you need the helper", "startDate"]) || "",
        preferences: normPrefText,
        budget: String(getField(data, ["Salary and palcement budget", "budget"]) || ""),
        nationalityPreferences: extractNationalityPrefs(
            getField(data, ["Nationality preference", "nationalityPreferences"]),
            getField(data, ["Preference remarks", "preferences"])
        ),
        helperType: getField(data, ["Type of helper", "helperType"]) || "",
        agePreference: getField(data, ["Prefer helper age", "agePreference"]) || prefNumbers.age || "",
        englishRequirement: getField(data, ["Prefer helper English Level", "englishRequirement"]) || "",
        heightPreference: getField(data, ["Prefer Helper Height (cm)", "heightPreference"]) || prefNumbers.height || "",
        weightPreference: getField(data, ["Prefer Helper Weight (kg)", "weightPreference"]) || prefNumbers.weight || "",
        experienceTags: splitToArray(getField(data, ["Prefer helper experince in infant/child/elder care", "experienceTags"])),
        religionPreference: getField(data, ["Prefer helper Religion", "Prefer helper Religion ", "religionPreference"]) || "",
        educationRequirement: getField(data, ["Prefer helper Education", "educationRequirement"]) || "",
        maritalPreference: getField(data, ["Prefer helper Marital Status", "maritalPreference"]) || "",
        helperChildrenAges: getField(data, ["Prefer helper Children age", "helperChildrenAges"]) || "",
        excludedBios: splitToArray(getField(data, ["Bio Sended", "excludedBios"])),
        focusArea: splitToArray(getField(data, ["focusArea"])),
    };
}

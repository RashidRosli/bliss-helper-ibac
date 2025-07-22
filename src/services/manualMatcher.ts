import Fuse from "fuse.js";
import { search } from "fast-fuzzy";
// @ts-ignore
import levenshtein from "js-levenshtein";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { extractNationalityPrefs } from '../utils/extractNationalityPrefs';
import { jobscopeMatcher } from '../utils/jobscopeMatcher';

// Extend dayjs with isSameOrBefore plugin
dayjs.extend(isSameOrBefore);

// --- Cache for Fuse.js instances ---
const fuseCache = new Map<string, Fuse<any>>();
function getFuseInstance(haystack: string): Fuse<any> {
    if (!fuseCache.has(haystack)) {
        fuseCache.set(haystack, new Fuse([{ text: haystack }], { keys: ["text"], threshold: 0.4 }));
    }
    return fuseCache.get(haystack)!;
}

// --- Fuzzy match helper with weighted scoring ---
export function fuzzyIncludesCombined(
    haystack: string,
    needle: string,
    levThreshold = 4
): { matched: boolean; score: number } {
    if (!haystack || !needle) return { matched: false, score: 0 };
    const hay = haystack.toLowerCase().trim();
    const ned = needle.toLowerCase().trim();
    const fastResult = search(ned, [hay], { returnMatchData: true });
    const fuse = getFuseInstance(hay);
    const fuseResult = fuse.search(ned);
    const levDist = levenshtein(hay, ned);
    const maxLen = Math.max(hay.length, ned.length);
    const levScore = maxLen > 0 ? 1 - levDist / maxLen : 0;

    let score = 0;
    if (fastResult.length && fastResult[0].item === hay) score = 1;
    else if (fuseResult.length > 0) score = 1 - fuseResult[0].score!;
    else if (levDist <= levThreshold) score = levScore * 0.8;
    else if (hay.includes(ned)) score = 0.9;

    return { matched: score > 0, score };
}

function isYes(value: any): boolean {
    return (value || '')
        .toString()
        .replace(/^[\s\u200B-\u200D\uFEFF\-–—]+/g, '')
        .replace(/^\W+/, '')
        .trim()
        .toLowerCase() === 'yes';
}

function parseThreeVal(value: any): { matched: boolean; status: string; clean: string; score: number } {
    const v = (value || '').toString().trim().toLowerCase();
    if (v === "yes") return { matched: true, status: "match", clean: "Yes", score: 1 };
    if (v === "no, but willing to learn") return { matched: false, status: "partial", clean: "No, but willing to learn", score: 0.5 };
    if (v === "will not accept" || v === "no") return { matched: false, status: "mismatch", clean: "Will not accept", score: 0 };
    return { matched: false, status: "mismatch", clean: v ? value : "No", score: 0 };
}

function extractPrefNumbers(preferences: string) {
    let out: { weight?: string; height?: string; age?: string } = {};
    if (!preferences) return out;
    const weightMatch = preferences.match(/(above|below)\s*(\d{2,3})\s*kg/i);
    if (weightMatch) out.weight = weightMatch[0];
    const heightMatch = preferences.match(/(above|below)\s*(\d{2,3})\s*cm/i);
    if (heightMatch) out.height = heightMatch[0];
    const ageMatch = preferences.match(/(above|below)\s*(\d{2})\s*(?:yo|years? old)?\b(?!\s*kg|\s*cm)/i);
    if (ageMatch) out.age = ageMatch[0];
    return out;
}

function fuzzyParseDate(str: string) {
    if (!str) return null;
    const lower = str.toLowerCase();
    if (lower.includes("anytime") || lower.includes("any time")) return null;
    const months = [
        "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december",
        "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec"
    ];
    const matchEMM = lower.match(/(end|early|mid)\s*([a-z]+)\s*(\d{4})?/);
    if (matchEMM) {
        let day = 15;
        if (matchEMM[1] === "early") day = 5;
        if (matchEMM[1] === "mid") day = 15;
        if (matchEMM[1] === "end") day = 25;
        let month = months.findIndex(m => m.startsWith(matchEMM[2].slice(0, 3)));
        if (month >= 12) month -= 12;
        if (month === -1) return null;
        const year = parseInt(matchEMM[3]) || dayjs().year();
        return dayjs(`${year}-${month + 1}-${day}`);
    }
    const matchMultiMonth = lower.match(/([a-z]+)\s*\/\s*([a-z]+)(?:\s*\/\s*([a-z]+))?\s*(\d{4})?/);
    if (matchMultiMonth) {
        const monthsInText = [matchMultiMonth[1], matchMultiMonth[2], matchMultiMonth[3]].filter(Boolean);
        let year = parseInt(matchMultiMonth[4]) || dayjs().year();
        for (const m of monthsInText) {
            const idx = months.findIndex(mon => mon.startsWith(m.slice(0, 3)));
            if (idx !== -1) {
                let realIdx = idx % 12;
                const d = dayjs(`${year}-${realIdx + 1}-1`);
                if (d.isAfter(dayjs())) return d;
            }
        }
        return dayjs(`${year}-${(months.findIndex(mon => mon.startsWith(monthsInText[0].slice(0, 3))) % 12) + 1}-1`);
    }
    const match2Months = lower.match(/([a-z]+)\s*\/\s*([a-z]+)/);
    if (match2Months) {
        let year = dayjs().year();
        const idx1 = months.findIndex(mon => mon.startsWith(match2Months[1].slice(0, 3)));
        const idx2 = months.findIndex(mon => mon.startsWith(match2Months[2].slice(0, 3)));
        if (idx1 !== -1) {
            const d = dayjs(`${year}-${(idx1 % 12) + 1}-1`);
            if (d.isAfter(dayjs())) return d;
        }
        if (idx2 !== -1) {
            const d = dayjs(`${year}-${(idx2 % 12) + 1}-1`);
            if (d.isAfter(dayjs())) return d;
        }
    }
    for (let m = 0; m < 12; m++) {
        if (lower.includes(months[m])) {
            const d = dayjs(`${dayjs().year()}-${m + 1}-1`);
            if (d.isAfter(dayjs())) return d;
        }
    }
    return null;
}

// --- Map child age to care band ---
function getCareBand(age: string): { type: 'infant' | 'childcare'; field: string; label: string } | null {
    const ageNum = parseFloat(age.replace(/[^0-9.]/g, ''));
    if (isNaN(ageNum)) return null;
    if (ageNum <= 0.5) return { type: 'infant', field: "Infant Care Work Experience YES IF 0-6m", label: "Infant Care (0-6m)" };
    if (ageNum <= 1) return { type: 'infant', field: "Infant Care Work Experience YES IF 7-12m", label: "Infant Care (7-12m)" };
    if (ageNum <= 3) return { type: 'childcare', field: "Childcare Work Experience YES IF 1-3y", label: "Childcare (1-3y)" };
    if (ageNum <= 6) return { type: 'childcare', field: "Childcare Work Experience YES IF 4-6y", label: "Childcare (4-6y)" };
    if (ageNum <= 12) return { type: 'childcare', field: "Childcare Work Experience YES IF 7-12y", label: "Childcare (7-12y)" };
    return null;
}

// --- Parse years of experience ---
function parseYearsOfExperience(years: any): number {
    const yearsStr = (years || '').toString().replace(/[^0-9.]/g, '');
    const yearsNum = parseFloat(yearsStr);
    return isNaN(yearsNum) ? 0 : Math.min(yearsNum, 20); // Cap at 20 years for scoring
}

export interface MatchCriterion {
    name: string;
    criteria: string;
    matched: boolean;
    status?: string;
    value?: any;
    reason?: string;
    weight: number;
    score: number;
    [key: string]: any;
}

export interface MatchReport {
    helper: any;
    score: number;
    maxScore: number;
    criteria: MatchCriterion[];
}

export function scoreAndReportHelper(helper: any, employer: any): MatchReport | null {
    let score = 0;
    let maxScore = 0;
    const criteria: MatchCriterion[] = [];

    // --- Critical Filter: Jobscope ---
    if (Array.isArray(employer.jobscope) && employer.jobscope.length > 0) {
        const { matchedTasks } = jobscopeMatcher(employer.jobscope, helper);
        const jobscopeWeight = employer.jobscope.length * 2;
        const matched = matchedTasks.length === employer.jobscope.length;
        criteria.push({
            name: "Jobscope Match",
            criteria: "Jobscope",
            matched,
            status: matched ? "match" : (matchedTasks.length > 0 ? "partial" : "mismatch"),
            value: matchedTasks.length > 0
                ? `${matchedTasks.length} of ${employer.jobscope.length} requested tasks matched: ${matchedTasks.join(', ')}`
                : "No tasks matched",
            reason: matched
                ? "All requested jobscope tasks are covered"
                : `Missing: ${employer.jobscope.filter((t: string) => !matchedTasks.includes(t)).join(', ')}`,
            weight: jobscopeWeight,
            score: matchedTasks.length * 2,
        });
        score += matchedTasks.length * 2;
        maxScore += jobscopeWeight;
        if (!matched) return null;
    } else {
        maxScore += 0;
    }

    // --- Dynamic Weighting based on focusArea ---
    const focusArea = typeof employer.focusArea === 'string' ? employer.focusArea.toLowerCase() : '';
    const isChildcareFocused = focusArea === 'childcare';
    const isElderlyFocused = focusArea === 'elderly care';
    const childcareWeightMultiplier = isChildcareFocused ? 2 : 1;
    const elderlyWeightMultiplier = isElderlyFocused ? 2 : 1;

    // --- Normalize preference fields ---
    const allPrefs = [
        (employer["Preference remarks"] || ''),
        (employer["preferences"] || '')
    ].filter(Boolean).join('\n');
    const prefNumbers = extractPrefNumbers(allPrefs);

    const agePrefRaw = employer["Prefer helper age"] || prefNumbers.age || "";
    const weightPrefRaw = employer["Prefer Helper Weight (kg)"] || prefNumbers.weight || "";
    const heightPrefRaw = employer["Prefer Helper Height (cm)"] || prefNumbers.height || "";

    // --- 1. Nationality (strict) ---
    const empNats = extractNationalityPrefs(
        employer["Nationality preference"],
        employer["Preference remarks"]
    ).map((n: string) => (n || '').toLowerCase().trim());
    const helperNat = (helper["Nationality"] || '').toLowerCase().trim();
    const natMatch = empNats.length === 0 || empNats.includes(helperNat);
    criteria.push({
        name: "Nationality",
        criteria: "Nationality",
        matched: natMatch,
        value: helper["Nationality"] || "",
        reason: natMatch
            ? "Nationality matches employer preference"
            : `Preferred: ${empNats.join(", ")} | Helper: ${helperNat}`,
        weight: 1,
        score: natMatch ? 1 : 0,
    });
    score += natMatch ? 1 : 0;
    maxScore += 1;

    // --- 2. Ex-SG (fuzzy) ---
    const exSGResult = fuzzyIncludesCombined(
        ((helper["Type"] || "") + " " + (helper["Helper Exp."] || "")),
        "ex-sg"
    );
    criteria.push({
        name: "Ex-SG Experience",
        criteria: "Ex-SG Experience",
        matched: exSGResult.matched,
        value: helper["Type"] || "",
        reason: exSGResult.matched ? "Helper is Ex-SG" : "Not Ex-SG",
        weight: 2,
        score: exSGResult.score * 2,
    });
    score += exSGResult.score * 2;
    maxScore += 2;

    // --- 3. English Level (fuzzy) ---
    const levels = ['learning', 'basic', 'average', 'good', 'very good'];
    const requiredLevel = (employer["Prefer helper English Level"] || 'average').toLowerCase().trim();
    const rawLanguage = (helper["Language"] || '').toLowerCase().trim();
    let helperLevel = 'average';
    if (levels.includes(rawLanguage)) {
        helperLevel = rawLanguage;
    } else if (fuzzyIncludesCombined(rawLanguage, 'very good').matched) {
        helperLevel = 'very good';
    } else if (fuzzyIncludesCombined(rawLanguage, 'good').matched) {
        helperLevel = 'good';
    } else if (fuzzyIncludesCombined(rawLanguage, 'average').matched || fuzzyIncludesCombined(rawLanguage, 'fair').matched) {
        helperLevel = 'average';
    } else if (fuzzyIncludesCombined(rawLanguage, 'basic').matched || fuzzyIncludesCombined(rawLanguage, 'poor').matched) {
        helperLevel = 'basic';
    } else if (fuzzyIncludesCombined(rawLanguage, 'learning').matched) {
        helperLevel = 'learning';
    }
    const engMatch = levels.indexOf(helperLevel) >= levels.indexOf(requiredLevel);
    criteria.push({
        name: "English Level",
        criteria: "English Level",
        matched: engMatch,
        value: helper["Language"] || "",
        reason: engMatch
            ? "English is sufficient"
            : `Employer wants: ${employer["Prefer helper English Level"]}, Helper: ${helper["Language"]}`,
        weight: 1,
        score: engMatch ? 1 : 0,
    });
    score += engMatch ? 1 : 0;
    maxScore += 1;

    // --- 4. Additional Languages (fuzzy) ---
    if (employer["Additional Languages"] && employer["Additional Languages"].length > 0) {
        const reqLanguages = employer["Additional Languages"].map((lang: string) => lang.toLowerCase().trim());
        const helperLanguages = (helper["Additional Languages"] || helper["Language"] || '').toLowerCase().split(/[\n,]/).map((s: string) => s.trim()).filter(Boolean);
        let langMatches: string[] = [];
        let langScore = 0;
        reqLanguages.forEach((lang: string) => {
            const result = fuzzyIncludesCombined(helperLanguages.join(' '), lang);
            if (result.matched) {
                langMatches.push(lang);
                langScore += result.score;
            }
        });
        const matched = langMatches.length > 0;
        criteria.push({
            name: "Additional Languages",
            criteria: "Additional Languages",
            matched,
            value: helperLanguages.join(', ') || "None",
            reason: matched
                ? `Matched languages: ${langMatches.join(", ")}`
                : `Employer wants: ${reqLanguages.join(", ")}, Helper: ${helperLanguages.join(", ") || "None"}`,
            weight: reqLanguages.length,
            score: langScore,
        });
        score += langScore;
        maxScore += reqLanguages.length;
    }

    // --- 5. Years of Experience (scaled) ---
    if (employer["Minimum Years of Experience"]) {
        const minYears = parseFloat(employer["Minimum Years of Experience"]) || 0;
        const helperYears = parseYearsOfExperience(helper["Years of Experience"]);
        const expMatch = helperYears >= minYears;
        const expScore = expMatch ? Math.min(helperYears / 10, 2) : 0;
        criteria.push({
            name: "Years of Experience",
            criteria: "Years of Experience",
            matched: expMatch,
            value: helperYears,
            reason: expMatch
                ? `Helper has ${helperYears} years, meets minimum ${minYears}`
                : `Helper has ${helperYears} years, below minimum ${minYears}`,
            weight: 2,
            score: expScore * 2,
        });
        score += expScore * 2;
        maxScore += 4;
    }

    // --- 6. Height (strict) ---
    let heightMatch = true;
    if (heightPrefRaw) {
        let minHeight = 0, maxHeight = 999;
        const heightStr = heightPrefRaw.toLowerCase().replace(/[^0-9\-]/g, '');
        if (heightPrefRaw.toLowerCase().includes('above')) {
            minHeight = parseInt(heightStr) || 0;
        } else if (heightPrefRaw.toLowerCase().includes('below')) {
            maxHeight = parseInt(heightStr) || 999;
        } else if (heightPrefRaw.includes('-')) {
            const parts = heightPrefRaw.split('-').map((s: string) => parseInt(s));
            minHeight = parts[0] || 0;
            maxHeight = parts[1] || 999;
        }
        let helperHeight = parseInt(helper["Height (cm)"] || '0');
        if (isNaN(helperHeight)) helperHeight = 0;
        heightMatch = helperHeight >= minHeight && helperHeight <= maxHeight;
        criteria.push({
            name: "Height",
            criteria: "Height",
            matched: heightMatch,
            value: helper["Height (cm)"] || "",
            reason: heightMatch
                ? "Height within preferred range"
                : `Employer wants ${heightPrefRaw}, Helper: ${helper["Height (cm)"]}`,
            weight: 1,
            score: heightMatch ? 1 : -1,
        });
        score += heightMatch ? 1 : -1;
        maxScore += 1;
    }

    // --- 7. Weight (strict) ---
    let weightMatch = true;
    if (weightPrefRaw) {
        let minWeight = 0, maxWeight = 9999;
        const weightStr = weightPrefRaw.toLowerCase().replace(/[^0-9\-]/g, '');
        if (weightPrefRaw.toLowerCase().includes('above')) {
            minWeight = parseInt(weightStr) || 0;
        } else if (weightPrefRaw.toLowerCase().includes('below')) {
            maxWeight = parseInt(weightStr) || 9999;
        } else if (weightPrefRaw.includes('-')) {
            const parts = weightPrefRaw.split('-').map((s: string) => parseInt(s));
            minWeight = parts[0] || 0;
            maxWeight = parts[1] || 9999;
        }
        let hWeight = parseInt(helper["Weight (Kg)"] || '0');
        if (isNaN(hWeight)) hWeight = 0;
        weightMatch = hWeight >= minWeight && hWeight <= maxWeight;
        criteria.push({
            name: "Weight",
            criteria: "Weight",
            matched: weightMatch,
            value: helper["Weight (Kg)"] || "",
            reason: weightMatch
                ? "Weight within preferred range"
                : `Employer wants ${weightPrefRaw}, Helper: ${helper["Weight (Kg)"]}`,
            weight: 1,
            score: weightMatch ? 1 : -1,
        });
        score += weightMatch ? 1 : -1;
        maxScore += 1;
    }

    // --- 8. Age (strict) ---
    let ageMatch = true;
    if (agePrefRaw && helper["Age"]) {
        let minAge = 0, maxAge = 99;
        const ageStr = agePrefRaw.toLowerCase().replace(/[^0-9\-]/g, '');
        if (agePrefRaw.toLowerCase().includes('above')) {
            minAge = parseInt(ageStr) || 0;
        } else if (agePrefRaw.toLowerCase().includes('below')) {
            maxAge = parseInt(ageStr) || 99;
        } else if (agePrefRaw.includes('-')) {
            const parts = agePrefRaw.split('-').map((s: string) => parseInt(s));
            minAge = parts[0] || 0;
            maxAge = parts[1] || 99;
        }
        let hAge = parseInt(helper["Age"] || '0');
        if (isNaN(hAge)) hAge = 0;
        ageMatch = hAge >= minAge && hAge <= maxAge;
        criteria.push({
            name: "Age",
            criteria: "Age",
            matched: ageMatch,
            value: helper["Age"] || "",
            reason: ageMatch
                ? "Age within preferred range"
                : `Employer wants ${agePrefRaw}, Helper: ${helper["Age"]}`,
            weight: 1,
            score: ageMatch ? 1 : -1,
        });
        score += ageMatch ? 1 : -1;
        maxScore += 1;
    }

    // --- 9. Salary (strict) ---
    let salaryMatch = true;
    if (employer["Salary and placement budget"]) {
        const employerSalary = employer["Salary and placement budget"].replace(/[^0-9\-]/g, '');
        let minSalary = 0, maxSalary = 99999;
        if (employer["Salary and placement budget"].toLowerCase().includes('below')) {
            maxSalary = parseInt(employerSalary) || 99999;
        } else if (employer["Salary and placement budget"].toLowerCase().includes('above')) {
            minSalary = parseInt(employerSalary) || 0;
        } else if (employer["Salary and placement budget"].includes('-')) {
            const parts = employer["Salary and placement budget"].split('-').map((s: string) => parseInt(s));
            minSalary = parts[0] || 0;
            maxSalary = parts[1] || 99999;
        } else if (employerSalary) {
            minSalary = maxSalary = parseInt(employerSalary);
        }
        let hSalary = parseInt(helper["Salary"] || '0');
        if (isNaN(hSalary)) hSalary = 0;
        salaryMatch = hSalary >= minSalary && hSalary <= maxSalary;
        criteria.push({
            name: "Salary",
            criteria: "Salary",
            matched: salaryMatch,
            value: helper["Salary"] || "",
            reason: salaryMatch
                ? "Salary within preferred range"
                : `Employer wants ${employer["Salary and placement budget"]}, Helper: ${helper["Salary"]}`,
            weight: 2,
            score: salaryMatch ? 2 : -2,
        });
        score += salaryMatch ? 2 : -2;
        maxScore += 2;
    }

    // --- 10. Childcare and Infant Care Experience ---
    const careBands = [
        { type: 'infant', field: "Infant Care Work Experience YES IF 0-6m", label: "Infant Care (0-6m)" },
        { type: 'infant', field: "Infant Care Work Experience YES IF 7-12m", label: "Infant Care (7-12m)" },
        { type: 'childcare', field: "Childcare Work Experience YES IF 1-3y", label: "Childcare (1-3y)" },
        { type: 'childcare', field: "Childcare Work Experience YES IF 4-6y", label: "Childcare (4-6y)" },
        { type: 'childcare', field: "Childcare Work Experience YES IF 7-12y", label: "Childcare (7-12y)" },
    ];
    if (employer.childrenAges && employer.childrenAges.length > 0) {
        const requiredBands = new Set(employer.childrenAges.map((age: string) => getCareBand(age)?.field).filter(Boolean));
        careBands.forEach(band => {
            const expValue = (helper[band.field] || '').toString().trim().toLowerCase();
            const matched = expValue === 'yes';
            const isRequired = requiredBands.has(band.field);
            const weight = isRequired ? 5 * childcareWeightMultiplier : 1 * childcareWeightMultiplier;
            criteria.push({
                name: band.label,
                criteria: band.field,
                matched,
                value: matched ? "Yes" : "No",
                reason: matched
                    ? `Has experience with ${band.label}`
                    : isRequired
                        ? `Required: No experience with ${band.label}`
                        : `No experience with ${band.label}`,
                weight,
                score: matched ? weight : (isRequired ? -weight : 0),
            });
            score += matched ? weight : (isRequired ? -weight : 0);
            maxScore += weight;
        });
        if (score <= -10) return null;
    } else {
        const baseWeight = 1 * childcareWeightMultiplier;
        maxScore += 5 * baseWeight;
    }

    // --- 11. Elderly Care Experience ---
    let elderlyCareType = "";
    let elderlyCareMatched = false;
    if ("Elderly Care Work Experience (Yes/No)" in helper) {
        elderlyCareMatched = isYes(helper["Elderly Care Work Experience (Yes/No)"]);
        elderlyCareType = elderlyCareMatched ? "Structured field (Yes)" : "Structured field (No)";
    } else {
        const fuzzyResult = fuzzyIncludesCombined(
            (helper["Work Experience"] || '') + " " + (helper["Skills"] || ''),
            'elderly'
        );
        elderlyCareMatched = fuzzyResult.matched;
        elderlyCareType = fuzzyResult.matched ? "Free text match" : "No evidence";
    }
    const elderlyWeight = employer.numberOfElderly > 0 ? 5 * elderlyWeightMultiplier : 1 * elderlyWeightMultiplier;
    criteria.push({
        name: "Elderly Care Experience",
        criteria: "Elderly Care Experience",
        matched: elderlyCareMatched,
        status: elderlyCareMatched ? "match" : "mismatch",
        value: elderlyCareMatched ? "Yes" : "No",
        reason: elderlyCareMatched
            ? (elderlyCareType === "Structured field (Yes)"
                ? "Has elderly care experience (structured field)"
                : "Has elderly care experience (free text)")
            : "No elderly care experience found",
        weight: elderlyWeight,
        score: elderlyCareMatched ? elderlyWeight : (employer.numberOfElderly > 0 ? -elderlyWeight : 0),
    });
    score += elderlyCareMatched ? elderlyWeight : (employer.numberOfElderly > 0 ? -elderlyWeight : 0);
    maxScore += elderlyWeight;

    // --- 12. Care Giver/Nursing Cert ---
    if ('Care Giver/Nursing aid Cert (Yes/No)' in helper) {
        const matched = isYes(helper["Care Giver/Nursing aid Cert (Yes/No)"]);
        const weight = isElderlyFocused ? 3 : 1;
        criteria.push({
            name: "Care Giver/Nursing Cert",
            criteria: "Care Giver/Nursing aid Cert (Yes/No)",
            matched,
            status: matched ? "match" : "mismatch",
            value: matched ? "Yes" : "No",
            reason: matched ? "Has care giver/nursing cert" : "No care giver/nursing cert",
            weight,
            score: matched ? weight : 0,
        });
        score += matched ? weight : 0;
        maxScore += weight;
    }

    // --- 13. Personal Elderly Care Experience ---
    if ('Personal Elderly Care Experience (Yes/No)' in helper) {
        const value = (helper["Personal Elderly Care Experience (Yes/No)"] || '').toString().trim().toLowerCase();
        const weight = isElderlyFocused ? 3 : 1;
        if (["yes", "no"].includes(value)) {
            const matched = value === "yes";
            criteria.push({
                name: "Personal Elderly Care Experience",
                criteria: "Personal Elderly Care Experience (Yes/No)",
                matched,
                status: matched ? "match" : "mismatch",
                value: matched ? "Yes" : "No",
                reason: matched ? "Has personal elderly care experience" : "No personal elderly care experience",
                weight,
                score: matched ? weight : 0,
            });
            score += matched ? weight : 0;
        } else {
            const res = parseThreeVal(value);
            criteria.push({
                name: "Personal Elderly Care Experience",
                criteria: "Personal Elderly Care Experience (Yes/No)",
                matched: res.status === "match",
                status: res.status,
                value: res.clean,
                reason: res.status === "match"
                    ? "Has personal elderly care experience"
                    : res.status === "partial"
                        ? "No experience, but willing to learn"
                        : "Will not accept",
                weight,
                score: res.score * weight,
            });
            score += res.score * weight;
        }
        maxScore += weight;
    }

    // --- 14. Personal Infant Care Experience ---
    if ('Personal Infant Care Experience YES if have same work exp OR OWN CHILDREN <3YO' in helper) {
        const res = parseThreeVal(helper["Personal Infant Care Experience YES if have same work exp OR OWN CHILDREN <3YO"]);
        const weight = isChildcareFocused ? 3 : 1;
        criteria.push({
            name: "Personal Infant Care Experience",
            criteria: "Personal Infant Care Experience YES if have same work exp OR OWN CHILDREN <3YO",
            matched: res.status === "match",
            status: res.status,
            value: res.clean,
            reason: res.status === "match"
                ? "Has personal infant care experience"
                : res.status === "partial"
                    ? "No experience, but willing to learn"
                    : "Will not accept",
            weight,
            score: res.score * weight,
        });
        score += res.score * weight;
        maxScore += weight;
    }

    // --- 15. Personal Childcare Experience ---
    if ('Personal Childcare Experience YES if have same work exp OR OWN CHILDREN <6YO' in helper) {
        const res = parseThreeVal(helper["Personal Childcare Experience YES if have same work exp OR OWN CHILDREN <6YO"]);
        const weight = isChildcareFocused ? 3 : 1;
        criteria.push({
            name: "Personal Childcare Experience",
            criteria: "Personal Childcare Experience YES if have same work exp OR OWN CHILDREN <6YO",
            matched: res.status === "match",
            status: res.status,
            value: res.clean,
            reason: res.status === "match"
                ? "Has personal childcare experience"
                : res.status === "partial"
                    ? "No experience, but willing to learn"
                    : "Will not accept",
            weight,
            score: res.score * weight,
        });
        score += res.score * weight;
        maxScore += weight;
    }

    // --- 16. Cooking (fuzzy) ---
    const workExp = (helper["Work Experience"] || '').toLowerCase();
    const cookResult = fuzzyIncludesCombined(workExp, 'cook');
    const cookWeight = employer.jobscope?.includes('cooking') ? 3 : 1;
    criteria.push({
        name: "Cooking Experience",
        criteria: "Cooking Experience",
        matched: cookResult.matched,
        value: cookResult.matched ? "Yes" : "No",
        reason: cookResult.matched ? "Has cooking experience" : "No cooking found in work experience",
        weight: cookWeight,
        score: cookResult.score * cookWeight,
    });
    score += cookResult.score * cookWeight;
    maxScore += cookWeight;

    // --- 17. Household Chores (fuzzy) ---
    const choresResult = fuzzyIncludesCombined(workExp, 'household') || fuzzyIncludesCombined(workExp, 'clean').matched;
    const choresWeight = employer.jobscope?.includes('household chores') ? 3 : 1;
    criteria.push({
        name: "Household Chores Experience",
        criteria: "Household Chores Experience",
        matched: choresResult.matched,
        value: choresResult ? "Yes" : "No",
        reason: choresResult ? "Has household chores experience" : "No household chores found",
        weight: choresWeight,
        score: choresResult ? choresWeight : 0,
    });
    score += choresResult ? choresWeight : 0;
    maxScore += choresWeight;

    // --- 18. Religion (strict) ---
    const empReligion = (employer["Prefer helper Religion"] || "").toLowerCase();
    const helperReligion = (helper["Religion"] || "").toLowerCase();
    let religionMatch = true;
    if (empReligion && empReligion !== "all" && empReligion !== "any" && empReligion !== "") {
        religionMatch = empReligion === helperReligion;
        criteria.push({
            name: "Religion",
            criteria: "Religion",
            matched: religionMatch,
            value: helper["Religion"] || "",
            reason: religionMatch ? "Religion matches" : `Employer: ${employer["Prefer helper Religion"]}, Helper: ${helper["Religion"]}`,
            weight: 1,
            score: religionMatch ? 1 : -1,
        });
        score += religionMatch ? 1 : -1;
    }
    maxScore += 1;

    // --- 19. Education (fuzzy) ---
    const empEdu = (employer["Prefer helper Education"] || "").toLowerCase();
    const helperEdu = (helper["Education"] || "").toLowerCase();
    let eduMatch = true;
    if (empEdu && empEdu !== "all" && empEdu !== "any" && empEdu !== "") {
        const eduResult = fuzzyIncludesCombined(helperEdu, empEdu);
        eduMatch = eduResult.matched;
        criteria.push({
            name: "Education",
            criteria: "Education",
            matched: eduMatch,
            value: helper["Education"] || "",
            reason: eduMatch ? "Education matches" : `Employer: ${employer["Prefer helper Education"]}, Helper: ${helper["Education"]}`,
            weight: 1,
            score: eduResult.score,
        });
        score += eduResult.score;
    }
    maxScore += 1;

    // --- 20. Marital Status (fuzzy) ---
    const empMarital = (employer["Prefer helper Marital Status"] || "").toLowerCase();
    const helperMarital = (helper["Marital Status"] || "").toLowerCase();
    let maritalMatch = true;
    if (empMarital && empMarital !== "all" && empMarital !== "any" && empMarital !== "") {
        const maritalResult = fuzzyIncludesCombined(helperMarital, empMarital);
        maritalMatch = maritalResult.matched;
        criteria.push({
            name: "Marital Status",
            criteria: "Marital Status",
            matched: maritalMatch,
            value: helper["Marital Status"] || "",
            reason: maritalMatch ? "Marital Status matches" : `Employer: ${employer["Prefer helper Marital Status"]}, Helper: ${helper["Marital Status"]}`,
            weight: 1,
            score: maritalResult.score,
        });
        score += maritalResult.score;
    }
    maxScore += 1;

    // --- 21. Pork Handling (fuzzy) ---
    if (employer["Eat Pork"] && employer["Eat Pork"] !== "all") {
        const porkResult = fuzzyIncludesCombined(
            (helper["Eat Pork"] || "").toUpperCase(),
            employer["Eat Pork"].toUpperCase()
        );
        criteria.push({
            name: "Eat Pork",
            criteria: "Eat Pork",
            matched: porkResult.matched,
            value: helper["Eat Pork"] || "",
            reason: porkResult.matched ? "Matches pork eating preference" : `Employer: ${employer["Eat Pork"]}, Helper: ${helper["Eat Pork"]}`,
            weight: 1,
            score: porkResult.score,
        });
        score += porkResult.score;
        maxScore += 1;
    }

    if (employer["Handle Pork"] && employer["Handle Pork"] !== "all") {
        const handlePorkResult = fuzzyIncludesCombined(
            (helper["Handle Pork"] || "").toUpperCase(),
            employer["Handle Pork"].toUpperCase()
        );
        criteria.push({
            name: "Handle Pork",
            criteria: "Handle Pork",
            matched: handlePorkResult.matched,
            value: helper["Handle Pork"] || "",
            reason: handlePorkResult.matched ? "Matches handle pork preference" : `Employer: ${employer["Handle Pork"]}, Helper: ${helper["Handle Pork"]}`,
            weight: 1,
            score: handlePorkResult.score,
        });
        score += handlePorkResult.score;
        maxScore += 1;
    }

    // --- 22. Off Days (strict) ---
    if (employer["No. of Off Day"]) {
        const offDayMatch = (helper["No. of Off Day"] || "") === employer["No. of Off Day"];
        criteria.push({
            name: "Off Days",
            criteria: "Off Days",
            matched: offDayMatch,
            value: helper["No. of Off Day"] || "",
            reason: offDayMatch ? "Matches off day requirement" : `Employer: ${employer["No. of Off Day"]}, Helper: ${helper["No. of Off Day"]}`,
            weight: 1,
            score: offDayMatch ? 1 : -1,
        });
        score += offDayMatch ? 1 : -1;
        maxScore += 1;
    }

    // --- 23. Passport Status and Availability Scheduling ---
    const empWhen = (employer["When do you need the helper"] || "").toLowerCase().trim();
    const helperPassport = (helper["Passport Status"] || "").toLowerCase();
    const helperAvailableFrom = fuzzyParseDate(helper["Available From"] || "");
    let passportMatch = true;
    let passportWeight = 1;
    let passportReason = "No specific timing required";
    const targetDate = fuzzyParseDate(empWhen);
    const now = dayjs();
    let isUrgent = empWhen.includes("immediate") || empWhen.includes("urgent") || empWhen.includes("asap");
    if (targetDate && targetDate.isValid()) {
        const daysUntil = targetDate.diff(now, "day");
        if (daysUntil <= 45) isUrgent = true;
    }
    if (!empWhen || empWhen.includes("anytime") || empWhen.includes("any time")) {
        passportMatch = true;
        passportReason = "No timing specified, any passport status accepted";
    } else if (isUrgent) {
        passportWeight = 3;
        passportMatch = helperPassport === "ready" && (!helperAvailableFrom || helperAvailableFrom.isSameOrBefore(now));
        passportReason = passportMatch
            ? "Helper passport ready and available for urgent need"
            : `Employer needs urgent, but passport: ${helperPassport}, available: ${helper["Available From"] || "N/A"}`;
    } else if (targetDate && targetDate.isValid()) {
        const daysUntil = targetDate.diff(now, "day");
        if (daysUntil <= 45) {
            passportWeight = 3;
            passportMatch = helperPassport === "ready" && (!helperAvailableFrom || helperAvailableFrom.isSameOrBefore(targetDate));
            passportReason = passportMatch
                ? "Passport ready and available for upcoming start"
                : `Employer needs within ${daysUntil} days, but passport: ${helperPassport}, available: ${helper["Available From"] || "N/A"}`;
        } else if (daysUntil <= 75) {
            passportWeight = 2;
            passportMatch = (helperPassport === "ready" || helperPassport.includes("process")) &&
                (!helperAvailableFrom || helperAvailableFrom.isSameOrBefore(targetDate));
            passportReason = passportMatch
                ? "Passport ready/in process and available for near-future start"
                : `Employer needs in ~2 months, but passport: ${helperPassport}, available: ${helper["Available From"] || "N/A"}`;
        } else {
            passportMatch = true;
            passportReason = "Employer need is far in future, any status is OK";
        }
    } else {
        passportWeight = 2;
        passportMatch = helperPassport === "ready" || helperPassport.includes("process");
        passportReason = passportMatch
            ? "Passport ready/in process for general need"
            : "Passport status might delay placement";
    }
    criteria.push({
        name: "Passport and Availability",
        criteria: "Passport Status and Availability",
        matched: passportMatch,
        value: `${helper["Passport Status"] || "N/A"}, Available: ${helper["Available From"] || "N/A"}`,
        reason: passportReason,
        weight: passportWeight,
        score: passportMatch ? passportWeight : -passportWeight,
    });
    score += passportMatch ? passportWeight : -passportWeight;
    maxScore += passportWeight;

    // --- 25. Pet Compatibility (fuzzy) ---
    if (employer.pets && employer.pets.length > 0) {
        const reqPets = employer.pets.map((p: string) => p.toLowerCase().trim());
        const helperPets = Array.isArray(helper["Pets"])
            ? helper["Pets"].map((p: string) => p.toLowerCase().trim())
            : [String(helper["Pets"] || "").toLowerCase().trim()];
        let petMatches: string[] = [];
        let petScore = 0;
        reqPets.forEach((pet: string) => {
            if (pet === "any") {
                petMatches.push("any");
                petScore += 1;
            } else {
                const result = fuzzyIncludesCombined(helperPets.join(' '), pet);
                if (result.matched) {
                    petMatches.push(pet);
                    petScore += result.score;
                }
            }
        });
        const matched = petMatches.length === reqPets.length || petMatches.includes("any");
        criteria.push({
            name: "Pet Compatibility",
            criteria: "Pets",
            matched,
            value: helperPets.join(', ') || "None",
            reason: matched
                ? `Matches pet preferences: ${petMatches.join(", ")}`
                : `Employer wants ${reqPets.join(", ")}, Helper: ${helperPets.join(", ") || "None"}`,
            weight: reqPets.length * 2,
            score: petScore,
        });
        score += petScore;
        maxScore += reqPets.length * 2;
    }

    // --- 26. Preference Remarks Matching with Priority (fuzzy) ---
    if (employer.preferences && employer.preferences.length > 0) {
        const prefs = employer.preferences
            .toLowerCase()
            .split(/[\n,]/)
            .map((s: string) => {
                const [pref, priority] = s.split('(').map(part => part.replace(')', '').trim());
                return { pref, priority: priority === 'must-have' ? 3 : priority === 'nice-to-have' ? 1 : 2 };
            })
            .filter((p: { pref: string; priority: number }) => p.pref);
        const helperProfile = (
            ((helper["Work Experience"] || '') + ' ' +
                (helper["Skills"] || '') + ' ' +
                (helper["Bio"] || '')).toLowerCase()
        );
        let prefsMatched: string[] = [];
        let totalPrefScore = 0;
        prefs.forEach(({ pref, priority }: { pref: string; priority: number }) => {
            if (pref) {
                const result = fuzzyIncludesCombined(helperProfile, pref);
                if (result.matched) {
                    prefsMatched.push(pref);
                    totalPrefScore += result.score * priority;
                }
            }
        });
        const matched = prefsMatched.length > 0;
        criteria.push({
            name: "Preferences Match",
            criteria: "Preference Remarks",
            matched,
            value: prefsMatched.length ? prefsMatched.join(', ') : "",
            reason: matched
                ? `Matched preferences: ${prefsMatched.join(", ")}`
                : "No preferences matched",
            weight: prefs.reduce((sum: number, p: { priority: number }) => sum + p.priority, 0),
            score: totalPrefScore,
        });
        score += totalPrefScore;
        maxScore += prefs.reduce((sum: number, p: { priority: number }) => sum + p.priority, 0);
    }

    return {
        helper,
        score,
        maxScore,
        criteria
    };
}

export function rankHelpers(helpers: any[], employer: any): MatchReport[] {
    return helpers
        .map(helper => scoreAndReportHelper(helper, employer))
        .filter((report): report is MatchReport => report !== null)
        .sort((a, b) => b.score - a.score);
}
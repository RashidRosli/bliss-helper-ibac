import Fuse from "fuse.js";
import { search } from "fast-fuzzy";
// @ts-ignore
import levenshtein from "js-levenshtein";
import dayjs from "dayjs";
import { extractNationalityPrefs } from '../utils/extractNationalityPrefs';
import { jobscopeMatcher } from '../utils/jobscopeMatcher';

// --- Fuzzy match helper: browser-safe, robust, multi-strategy ---
export function fuzzyIncludesCombined(
    haystack: string,
    needle: string,
    fuseThreshold = 0.4,
    levThreshold = 4
) {
    if (!haystack || !needle) return false;
    const hay = haystack.toLowerCase();
    const ned = needle.toLowerCase();
    const fastResult = search(ned, [hay]);
    const fuse = new Fuse([{ text: hay }], { keys: ["text"], threshold: fuseThreshold });
    const fuseResult = fuse.search(ned);
    const levDist = levenshtein(hay, ned);

    return (
        (fastResult.length && fastResult[0] === hay) ||
        fuseResult.length > 0 ||
        levDist <= levThreshold ||
        hay.includes(ned)
    );
}

function isYes(value: any): boolean {
    return (value || '')
        .toString()
        .replace(/^[\s\u200B-\u200D\uFEFF\-–—]+/g, '')  // removes all types of dashes, unicode spaces
        .replace(/^\W+/, '') // removes any other non-alphanumeric at start
        .trim()
        .toLowerCase() === 'yes';
}
function parseThreeVal(value: any) {
    const v = (value || '').toString().trim().toLowerCase();
    if (v === "yes") return { matched: true, status: "match", clean: "Yes" };
    if (v === "no, but willing to learn") return { matched: false, status: "partial", clean: "No, but willing to learn" };
    if (v === "will not accept" || v === "no") return { matched: false, status: "mismatch", clean: "Will not accept" };
    return { matched: false, status: "mismatch", clean: v ? value : "No" };
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

export interface MatchCriterion {
    name: string;
    criteria: string;
    matched: boolean;
    status?: string;
    value?: any;
    reason?: string;
    weight: number;
    [key: string]: any;
}

export interface MatchReport {
    helper: any;
    score: number;
    criteria: MatchCriterion[];
}

export function scoreAndReportHelper(helper: any, employer: any): MatchReport {
    let score = 0;
    const criteria: MatchCriterion[] = [];

    // --- Normalize preference fields for fallback
    const allPrefs = [
        (employer["Preference remarks"] || ''),
        (employer["preferences"] || '')
    ].filter(Boolean).join('\n');
    const prefNumbers = extractPrefNumbers(allPrefs);

    // For matching: Use explicit field, else fallback to preference remark extraction
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
    });
    if (natMatch) score += 1;

    // --- 2. Ex-SG (fuzzy) ---
    const exSG = fuzzyIncludesCombined(
        ((helper["Type"] || "") + " " + (helper["Helper Exp."] || "")),
        "ex-sg"
    );
    criteria.push({
        name: "Ex-SG Experience",
        criteria: "Ex-SG Experience",
        matched: exSG,
        value: helper["Type"] || "",
        reason: exSG ? "Helper is Ex-SG" : "Not Ex-SG",
        weight: 2,
    });
    if (exSG) score += 2;

    // --- 3. English Level (fuzzy) ---
    const levels = ['learning', 'basic', 'average', 'good', 'very good'];
    const requiredLevel = (employer["Prefer helper English Level"] || 'average').toLowerCase().trim();
    const rawLanguage = (helper["Language"] || '').toLowerCase().trim();
    let helperLevel = 'average';
    if (levels.includes(rawLanguage)) {
        helperLevel = rawLanguage;
    } else if (fuzzyIncludesCombined(rawLanguage, 'very good')) {
        helperLevel = 'very good';
    } else if (fuzzyIncludesCombined(rawLanguage, 'good')) {
        helperLevel = 'good';
    } else if (fuzzyIncludesCombined(rawLanguage, 'average') || fuzzyIncludesCombined(rawLanguage, 'fair')) {
        helperLevel = 'average';
    } else if (fuzzyIncludesCombined(rawLanguage, 'basic') || fuzzyIncludesCombined(rawLanguage, 'poor')) {
        helperLevel = 'basic';
    } else if (fuzzyIncludesCombined(rawLanguage, 'learning')) {
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
    });
    if (engMatch) score += 1;

    // --- 4. Height (strict) ---
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
        });
        if (heightMatch) score += 1;
    }

    // --- 5. Weight (strict) ---
    let weightMatch = true;
    if (weightPrefRaw) {
        const employerWeight = weightPrefRaw;
        let minWeight = 0, maxWeight = 9999;
        const weightStr = employerWeight.toLowerCase().replace(/[^0-9\-]/g, '');
        if (employerWeight.toLowerCase().includes('above')) {
            minWeight = parseInt(weightStr) || 0;
        } else if (employerWeight.toLowerCase().includes('below')) {
            maxWeight = parseInt(weightStr) || 9999;
        } else if (employerWeight.includes('-')) {
            const parts = employerWeight.split('-').map((s: string) => parseInt(s));
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
                : `Employer wants ${employerWeight}, Helper: ${helper["Weight (Kg)"]}`,
            weight: 1,
        });
        if (weightMatch) score += 1;
    }

    // --- 6. Age (strict) ---
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
        });
        if (ageMatch) score += 1;
    }

    // --- 7. Salary (strict) ---
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
            weight: 1,
        });
        if (salaryMatch) score += 1;
    }

    // --- 8. Childcare Experience (YES/NO banded, strict) ---
    const childcareBands = [
        { field: "Childcare Work Experience YES IF 1-3y", label: "Childcare (1-3y)" },
        { field: "Childcare Work Experience YES IF 4-6y", label: "Childcare (4-6y)" },
        { field: "Childcare Work Experience YES IF 7-12y", label: "Childcare (7-12y)" },
    ];
    childcareBands.forEach(band => {
        const expValue = (helper[band.field] || '').toString().trim().toLowerCase();
        const matched = expValue === 'yes';
        criteria.push({
            name: band.label,
            criteria: band.field,
            matched,
            value: matched ? "Yes" : "No",
            reason: matched ? `Has experience with ${band.label}` : `No experience with ${band.label}`,
            weight: 1,
        });
        if (matched) score += 1;
    });

    // --- 9. Infant Care Experience (YES/NO banded, strict) ---
    const infantBands = [
        { field: "Infant Care Work Experience YES IF 0-6m", label: "Infant Care (0-6m)" },
        { field: "Infant Care Work Experience YES IF 7-12m", label: "Infant Care (7-12m)" },
    ];
    infantBands.forEach(band => {
        const expValue = (helper[band.field] || '').toString().trim().toLowerCase();
        const matched = expValue === 'yes';
        criteria.push({
            name: band.label,
            criteria: band.field,
            matched,
            value: matched ? "Yes" : "No",
            reason: matched ? `Has experience with ${band.label}` : `No experience with ${band.label}`,
            weight: 1,
        });
        if (matched) score += 1;
    });

    // --- Elderly Care Experience (merged) ---
    let elderlyCareType = "";
    let elderlyCareMatched = false;

    if ("Elderly Care Work Experience (Yes/No)" in helper) {
        elderlyCareMatched = isYes(helper["Elderly Care Work Experience (Yes/No)"]);
        elderlyCareType = elderlyCareMatched ? "Structured field (Yes)" : "Structured field (No)";
    } else {
        elderlyCareMatched = fuzzyIncludesCombined(
            (helper["Work Experience"] || '') + " " + (helper["Skills"] || ''),
            'elderly'
        );
        elderlyCareType = elderlyCareMatched ? "Free text match" : "No evidence";
    }

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
        weight: elderlyCareMatched ? 1 : 0,
    });
    if (elderlyCareMatched) score += 1;

    // --- Care Giver/Nursing aid Cert (Yes/No) ---
    if ('Care Giver/Nursing aid Cert (Yes/No)' in helper) {
        const matched = isYes(helper["Care Giver/Nursing aid Cert (Yes/No)"]);
        criteria.push({
            name: "Care Giver/Nursing Cert",
            criteria: "Care Giver/Nursing aid Cert (Yes/No)",
            matched,
            status: matched ? "match" : "mismatch",
            value: matched ? "Yes" : "No",
            reason: matched ? "Has care giver/nursing cert" : "No care giver/nursing cert",
            weight: matched ? 1 : 0,
        });
        if (matched) score += 1;
    }

    // --- Personal Elderly Care Experience (Yes/No or 3-value) ---
    if ('Personal Elderly Care Experience (Yes/No)' in helper) {
        const value = (helper["Personal Elderly Care Experience (Yes/No)"] || '').toString().trim().toLowerCase();
        if (["yes", "no"].includes(value)) {
            const matched = value === "yes";
            criteria.push({
                name: "Personal Elderly Care Experience",
                criteria: "Personal Elderly Care Experience (Yes/No)",
                matched,
                status: matched ? "match" : "mismatch",
                value: matched ? "Yes" : "No",
                reason: matched ? "Has personal elderly care experience" : "No personal elderly care experience",
                weight: matched ? 1 : 0,
            });
            if (matched) score += 1;
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
                weight: res.status === "match" ? 1 : 0,
            });
            if (res.status === "match") score += 1;
        }
    }

    // --- Personal Infant Care Experience (3-value) ---
    if ('Personal Infant Care Experience YES if have same work exp OR OWN CHILDREN <3YO' in helper) {
        const res = parseThreeVal(helper["Personal Infant Care Experience YES if have same work exp OR OWN CHILDREN <3YO"]);
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
            weight: res.status === "match" ? 1 : 0,
        });
        if (res.status === "match") score += 1;
    }

    // --- Personal Childcare Experience (3-value) ---
    if ('Personal Childcare Experience YES if have same work exp OR OWN CHILDREN <6YO' in helper) {
        const res = parseThreeVal(helper["Personal Childcare Experience YES if have same work exp OR OWN CHILDREN <6YO"]);
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
            weight: res.status === "match" ? 1 : 0,
        });
        if (res.status === "match") score += 1;
    }

    // --- 14. Cooking (fuzzy) ---
    const workExp = (helper["Work Experience"] || '').toLowerCase();
    const cookMatch = fuzzyIncludesCombined(workExp, 'cook');
    criteria.push({
        name: "Cooking Experience",
        criteria: "Cooking Experience",
        matched: cookMatch,
        value: cookMatch ? "Yes" : "No",
        reason: cookMatch ? "Has cooking experience" : "No cooking found in work experience",
        weight: 1,
    });
    if (cookMatch) score += 1;

    // --- 15. Household Chores (fuzzy) ---
    const choresMatch = fuzzyIncludesCombined(workExp, 'household') || fuzzyIncludesCombined(workExp, 'clean');
    criteria.push({
        name: "Household Chores Experience",
        criteria: "Household Chores Experience",
        matched: choresMatch,
        value: choresMatch ? "Yes" : "No",
        reason: choresMatch ? "Has household chores experience" : "No household chores found",
        weight: 1,
    });
    if (choresMatch) score += 1;

    // --- 16. Religion (strict) ---
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
        });
        if (religionMatch) score += 1;
    }

    // --- 17. Education (fuzzy) ---
    const empEdu = (employer["Prefer helper Education"] || "").toLowerCase();
    const helperEdu = (helper["Education"] || "").toLowerCase();
    let eduMatch = true;
    if (empEdu && empEdu !== "all" && empEdu !== "any" && empEdu !== "") {
        eduMatch = fuzzyIncludesCombined(helperEdu, empEdu);
        criteria.push({
            name: "Education",
            criteria: "Education",
            matched: eduMatch,
            value: helper["Education"] || "",
            reason: eduMatch ? "Education matches" : `Employer: ${employer["Prefer helper Education"]}, Helper: ${helper["Education"]}`,
            weight: 1,
        });
        if (eduMatch) score += 1;
    }

    // --- 18. Marital Status (fuzzy) ---
    const empMarital = (employer["Prefer helper Marital Status"] || "").toLowerCase();
    const helperMarital = (helper["Marital Status"] || "").toLowerCase();
    let maritalMatch = true;
    if (empMarital && empMarital !== "all" && empMarital !== "any" && empMarital !== "") {
        maritalMatch = fuzzyIncludesCombined(helperMarital, empMarital);
        criteria.push({
            name: "Marital Status",
            criteria: "Marital Status",
            matched: maritalMatch,
            value: helper["Marital Status"] || "",
            reason: maritalMatch ? "Marital Status matches" : `Employer: ${employer["Prefer helper Marital Status"]}, Helper: ${helper["Marital Status"]}`,
            weight: 1,
        });
        if (maritalMatch) score += 1;
    }

    // --- 19. Pork handling (fuzzy) ---
    if (employer["Eat Pork"] && employer["Eat Pork"] !== "all") {
        const porkMatch = fuzzyIncludesCombined(
            (helper["Eat Pork"] || "").toUpperCase(),
            employer["Eat Pork"].toUpperCase()
        );
        criteria.push({
            name: "Eat Pork",
            criteria: "Eat Pork",
            matched: porkMatch,
            value: helper["Eat Pork"] || "",
            reason: porkMatch ? "Matches pork eating preference" : `Employer: ${employer["Eat Pork"]}, Helper: ${helper["Eat Pork"]}`,
            weight: 1,
        });
        if (porkMatch) score += 1;
    }

    // --- 20. Handle pork (fuzzy) ---
    if (employer["Handle Pork"] && employer["Handle Pork"] !== "all") {
        const handlePorkMatch = fuzzyIncludesCombined(
            (helper["Handle Pork"] || "").toUpperCase(),
            employer["Handle Pork"].toUpperCase()
        );
        criteria.push({
            name: "Handle Pork",
            criteria: "Handle Pork",
            matched: handlePorkMatch,
            value: helper["Handle Pork"] || "",
            reason: handlePorkMatch ? "Matches handle pork preference" : `Employer: ${employer["Handle Pork"]}, Helper: ${helper["Handle Pork"]}`,
            weight: 1,
        });
        if (handlePorkMatch) score += 1;
    }

    // --- 21. Off day (strict) ---
    if (employer["No. of Off Day"]) {
        const offDayMatch = (helper["No. of Off Day"] || "") === employer["No. of Off Day"];
        criteria.push({
            name: "Off Days",
            criteria: "Off Days",
            matched: offDayMatch,
            value: helper["No. of Off Day"] || "",
            reason: offDayMatch ? "Matches off day requirement" : `Employer: ${employer["No. of Off Day"]}, Helper: ${helper["No. of Off Day"]}`,
            weight: 1,
        });
        if (offDayMatch) score += 1;
    }

    // --- 22. Passport Status vs Employer Timing Need (strict) ---
    const empWhen = (employer["When do you need the helper"] || "").toLowerCase().trim();
    const helperPassport = (helper["Passport Status"] || "").toLowerCase();

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
        passportWeight = 2;
        passportMatch = helperPassport === "ready";
        passportReason = passportMatch
            ? "Helper passport ready for urgent need"
            : "Employer needs urgent/helper is not passport ready";
    } else if (targetDate && targetDate.isValid()) {
        const daysUntil = targetDate.diff(now, "day");
        if (daysUntil <= 45) {
            passportWeight = 2;
            passportMatch = helperPassport === "ready";
            passportReason = passportMatch
                ? "Passport ready for upcoming start"
                : `Employer needs within ${daysUntil} days, but passport not ready`;
        } else if (daysUntil <= 75) {
            passportMatch = helperPassport === "ready" || helperPassport.includes("process");
            passportReason = passportMatch
                ? "Passport ready or in processing for near-future start"
                : `Employer needs in ~2 months, but passport is ${helper["Passport Status"]}`;
        } else {
            passportMatch = true;
            passportReason = "Employer need is far in future, any status is OK";
        }
    } else {
        passportMatch = helperPassport === "ready" || helperPassport.includes("process");
        passportReason = passportMatch
            ? "Passport ready/in process for general need"
            : "Passport status might delay placement";
    }

    criteria.push({
        name: "Passport Readiness",
        criteria: "Passport Readiness",
        matched: passportMatch,
        value: helper["Passport Status"] || "",
        reason: passportReason,
        weight: passportWeight,
    });
    if (passportMatch) score += passportWeight;

    // --- 23. Jobscope Matching (jobscopeMatcher.ts helper!) ---
    if (Array.isArray(employer.jobscope) && employer.jobscope.length > 0) {
        const { matchedTasks, missingTasks } = jobscopeMatcher(employer.jobscope, helper);
        const matched = matchedTasks.length === employer.jobscope.length && employer.jobscope.length > 0;
        criteria.push({
            name: "Jobscope Match",
            criteria: "Jobscope",
            matched,
            status: matched
                ? "match"
                : (matchedTasks.length > 0 ? "partial" : "mismatch"),
            value: matchedTasks.length > 0
                ? `${matchedTasks.length} of ${employer.jobscope.length} requested tasks matched: ${matchedTasks.join(', ')}`
                : "No tasks matched",
            reason: matched
                ? "All requested jobscope tasks are covered in helper's structured experience"
                : missingTasks.length > 0
                    ? `Missing: ${missingTasks.join(', ')}`
                    : "No specific tasks requested",
            weight: employer.jobscope.length > 0 ? employer.jobscope.length : 1
        });
        if (matchedTasks.length > 0) score += matchedTasks.length;
    }

    // --- 24. Preference Remarks Matching (fuzzy) ---
    if (employer.preferences && employer.preferences.length > 0) {
        const prefs = employer.preferences.toLowerCase().split(/[\n,]/).map((s: string) => s.trim()).filter(Boolean);
        const helperProfile = (
            ((helper["Work Experience"] || '') + ' ' +
                (helper["Skills"] || '') + ' ' +
                (helper["Bio"] || '')).toLowerCase()
        );
        let prefsMatched: string[] = [];
        let prefsMissed: string[] = [];
        prefs.forEach((pref: string) => {
            if (pref && fuzzyIncludesCombined(helperProfile, pref)) {
                prefsMatched.push(pref);
            } else if (pref) {
                prefsMissed.push(pref);
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
                : (prefsMissed.length ? `No preferences matched. Example missing: ${prefsMissed[0]}` : "No preference phrases given"),
            weight: 1,
        });
        if (matched) score += prefsMatched.length * 1;
    }
    return {
        helper,
        score,
        criteria
    };
}

// --- Helper for ranking ---
export function rankHelpers(helpers: any[], employer: any): MatchReport[] {
    return helpers
        .map(helper => scoreAndReportHelper(helper, employer))
        .sort((a, b) => b.score - a.score);
}

/*
==========================================================
PRO TIP: YES/NO fields should use strict matching only!
==========================================================
For "Yes"/"No" structured columns, use:
    (value || '').toString().trim().toLowerCase() === 'yes'
Never fuzzy match these fields.
==========================================================
*/

import Fuse from 'fuse.js';
import { extractNationalityPrefs } from '../utils/extractNationalityPrefs';
import dayjs from "dayjs";
import { jobscopeMatcher } from '../utils/jobscopeMatcher';

// --- Fuzzy match helper ---
function fuzzyIncludes(haystack: string, needle: string, threshold = 0.4) {
    if (!haystack || !needle) return false;
    const fuse = new Fuse([{ text: haystack }], {
        keys: ['text'],
        threshold: threshold,
        minMatchCharLength: Math.max(needle.length - 2, 3),
        includeScore: false,
    });
    return fuse.search(needle).length > 0;
}

// --- Parse Date ---
function fuzzyParseDate(str: string): dayjs.Dayjs | null {
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

// --- Types ---
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

// --- Main Matching Function ---
export function scoreAndReportHelper(helper: any, employer: any): MatchReport {
    let score = 0;
    const criteria: MatchCriterion[] = [];

    // 1. Nationality
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

    // 2. Ex-SG
    const exSG =
        ((helper["Type"] || "") + " " + (helper["Helper Exp."] || ""))
            .toLowerCase()
            .includes("ex-sg");
    criteria.push({
        name: "Ex-SG Experience",
        criteria: "Ex-SG Experience",
        matched: exSG,
        value: helper["Type"] || "",
        reason: exSG ? "Helper is Ex-SG" : "Not Ex-SG",
        weight: 2,
    });
    if (exSG) score += 2;

    // 3. English Level
    const levels = ['learning', 'basic', 'average', 'good', 'very good'];
    const requiredLevel = (employer["Prefer helper English Level"] || 'average').toLowerCase().trim();
    const rawLanguage = (helper["Language"] || '').toLowerCase().trim();
    let helperLevel = 'average';
    if (levels.includes(rawLanguage)) {
        helperLevel = rawLanguage;
    } else if (rawLanguage.includes('very good')) {
        helperLevel = 'very good';
    } else if (rawLanguage.includes('good')) {
        helperLevel = 'good';
    } else if (rawLanguage.includes('average') || rawLanguage.includes('fair')) {
        helperLevel = 'average';
    } else if (rawLanguage.includes('basic') || rawLanguage.includes('poor')) {
        helperLevel = 'basic';
    } else if (rawLanguage.includes('learning')) {
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

    // 4. Height
    const minHeight = parseInt((employer["Prefer Helper Height (cm)"] || '0').replace(/[^\d]/g, '')) || 0;
    let helperHeight = parseInt(helper["Height (cm)"] || '0');
    if (isNaN(helperHeight)) helperHeight = 0;
    const heightMatch = helperHeight > minHeight;
    criteria.push({
        name: "Height",
        criteria: "Height",
        matched: heightMatch,
        value: helper["Height (cm)"] || "",
        reason: heightMatch
            ? "Height above minimum"
            : `Employer wants >${minHeight}cm, Helper: ${helper["Height (cm)"]}`,
        weight: 1,
    });
    if (heightMatch) score += 1;

    // 5. Weight
    let weightMatch = true;
    if (employer["Prefer Helper Weight (kg)"]) {
        const employerWeight = employer["Prefer Helper Weight (kg)"];
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
                : `Employer wants ${employer["Prefer Helper Weight (kg)"]}, Helper: ${helper["Weight (Kg)"]}`,
            weight: 1,
        });
        if (weightMatch) score += 1;
    }

    // 6. Salary
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

    // 7. Childcare (7-12y)
    const childExp = ((helper["Childcare Work Experience YES IF 7-12y"] || '').toUpperCase() === 'YES');
    criteria.push({
        name: "Childcare (7-12y) Experience",
        criteria: "Childcare (7-12y) Experience",
        matched: childExp,
        value: helper["Childcare Work Experience YES IF 7-12y"] || "",
        reason: childExp ? "Has experience with 7-12y" : "No experience",
        weight: 1,
    });
    if (childExp) score += 1;

    // 8. Infant Care
    const infantCare = ((helper["Infant Care Work Experience YES IF 0-6m"] || '').toUpperCase() === "YES") ||
        ((helper["Infant Care Work Experience YES IF 7-12m"] || '').toUpperCase() === "YES");
    criteria.push({
        name: "Infant Care Experience",
        criteria: "Infant Care Experience",
        matched: infantCare,
        value: (helper["Infant Care Work Experience YES IF 0-6m"] || "") + " / " + (helper["Infant Care Work Experience YES IF 7-12m"] || ""),
        reason: infantCare ? "Has infant care experience" : "No infant care experience",
        weight: 1,
    });
    if (infantCare) score += 1;

    // 9. Elderly Care
    const elderlyCare = ((helper["Elderly Care Work Experience (Yes/No)"] || '').toUpperCase() === "YES") ||
        ((helper["Personal Elderly Care Experience (Yes/No)"] || '').toUpperCase().includes("YES"));
    criteria.push({
        name: "Elderly Care Experience",
        criteria: "Elderly Care Experience",
        matched: elderlyCare,
        value: helper["Elderly Care Work Experience (Yes/No)"] || "",
        reason: elderlyCare ? "Has elderly care experience" : "No elderly care experience",
        weight: 1,
    });
    if (elderlyCare) score += 1;

    // 10. Cooking
    const workExp = (helper["Work Experience"] || '').toLowerCase();
    const cookMatch = workExp.includes('cook');
    criteria.push({
        name: "Cooking Experience",
        criteria: "Cooking Experience",
        matched: cookMatch,
        value: helper["Work Experience"] || "",
        reason: cookMatch ? "Has cooking experience" : "No cooking found in work experience",
        weight: 1,
    });
    if (cookMatch) score += 1;

    // 11. Household Chores
    const choresMatch = workExp.includes('household') || workExp.includes('clean');
    criteria.push({
        name: "Household Chores Experience",
        criteria: "Household Chores Experience",
        matched: choresMatch,
        value: helper["Work Experience"] || "",
        reason: choresMatch ? "Has household chores experience" : "No household chores found",
        weight: 1,
    });
    if (choresMatch) score += 1;

    // 12. Religion
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

    // 13. Education
    const empEdu = (employer["Prefer helper Education"] || "").toLowerCase();
    const helperEdu = (helper["Education"] || "").toLowerCase();
    let eduMatch = true;
    if (empEdu && empEdu !== "all" && empEdu !== "any" && empEdu !== "") {
        eduMatch = empEdu === helperEdu;
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

    // 14. Marital Status
    const empMarital = (employer["Prefer helper Marital Status"] || "").toLowerCase();
    const helperMarital = (helper["Marital Status"] || "").toLowerCase();
    let maritalMatch = true;
    if (empMarital && empMarital !== "all" && empMarital !== "any" && empMarital !== "") {
        maritalMatch = empMarital === helperMarital;
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

    // 15. Pork handling
    if (employer["Eat Pork"] && employer["Eat Pork"] !== "all") {
        const porkMatch = ((helper["Eat Pork"] || "").toUpperCase() === employer["Eat Pork"].toUpperCase());
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

    // 16. Handle pork
    if (employer["Handle Pork"] && employer["Handle Pork"] !== "all") {
        const handlePorkMatch = ((helper["Handle Pork"] || "").toUpperCase() === employer["Handle Pork"].toUpperCase());
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

    // 17. Off day
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

    // 18. Passport Status vs Employer Timing Need
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

    // 19. Jobscope Matching (integrated with jobscopeMatcher.ts)
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

    // 20. Preference Remarks Matching (fuzzy)
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
            if (pref && fuzzyIncludes(helperProfile, pref)) {
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

    // --- DEBUG OUTPUTS ---
    // console.log('--- Matching Helper:', helper["Name"] || "[No Name]", '---');
    // console.log('Final Score:', score);
    // console.log('Criteria:', criteria);

    return {
        helper,
        score,
        criteria
    };
}

export function rankHelpers(helpers: any[], employer: any): MatchReport[] {
    return helpers
        .map(helper => scoreAndReportHelper(helper, employer))
        .sort((a, b) => b.score - a.score);
}

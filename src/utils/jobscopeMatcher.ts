import { fuzzyIncludesCombined } from "../services/manualMatcher"; // Adjust path if needed

// --- Centralized band mapping for structured jobscope ---
const JOBSCOPE_FIELD_MAP = [
  {
    keywords: ["take care newborn", "infant care", "baby", "newborn"],
    columns: [
      "Infant Care Work Experience YES IF 0-6m",
      "Infant Care Work Experience YES IF 7-12m"
    ],
    yesValue: "YES"
  },
  {
    keywords: ["take care child", "child care", "taking care of kids", "kids", "childcare", "child"],
    columns: [
      "Childcare Work Experience YES IF 1-3y",
      "Childcare Work Experience YES IF 4-6y",
      "Childcare Work Experience YES IF 7-12y"
    ],
    yesValue: "YES"
  },
  {
    keywords: ["elderly care", "take care elderly", "assist elderly", "elderly"],
    columns: [
      "Elderly Care Work Experience (Yes/No)",
      "Personal Elderly Care Experience (Yes/No)"
    ],
    yesValue: "YES"
  },
  {
    keywords: ["household chores", "housework", "general housework", "cleaning"],
    columns: ["Work Experience"]
  },
  {
    keywords: ["cooking", "cook"],
    columns: ["Work Experience"]
  },
  {
    keywords: ["caregiver", "nursing"],
    columns: ["Care Giver/Nursing aid Cert (Yes/No)"],
    yesValue: "YES"
  },
  {
    keywords: ["pet care", "dog care", "cat care", "pets", "pet"],
    columns: ["Work Experience"]
  },
  {
    keywords: ["laundry", "washing clothes", "ironing"],
    columns: ["Work Experience"]
  },
  {
    keywords: ["marketing", "grocery shopping"],
    columns: ["Work Experience"]
  },
  {
    keywords: ["change diaper", "change diapers", "diaper"],
    columns: ["Work Experience"]
  },
  // Add more synonyms/bahasa as needed!
];

export function jobscopeMatcher(employerJobscope: string[], helper: any) {
  const matchedTasks: string[] = [];
  const missingTasks: string[] = [];
  const reasons: Record<string, string> = {};

  // Helper profile for fallback
  const helperProfile = (
    (helper["Work Experience"] || "") +
    " " +
    (helper["Skills"] || "") +
    " " +
    (helper["Bio"] || "")
  ).toLowerCase();

  employerJobscope.forEach((task) => {
    let matched = false;
    let reason = "";

    for (const mapping of JOBSCOPE_FIELD_MAP) {
      // Fuzzy match employer jobscope phrase to mapping keywords
      if (
        mapping.keywords.some((keyword) =>
          fuzzyIncludesCombined(task.toLowerCase(), keyword) ||
          fuzzyIncludesCombined(keyword, task.toLowerCase())
        )
      ) {
        // Check structured fields
        if (
          mapping.columns.some((col) =>
            helper[col] &&
            (
              !mapping.yesValue ||
              String(helper[col]).toUpperCase().includes(mapping.yesValue)
            )
          )
        ) {
          matched = true;
          reason = `Matched via ${mapping.columns.join("/")} field(s)`;
          break;
        }

        // Fuzzy match in Work Experience (if included)
        if (
          mapping.columns.includes("Work Experience") &&
          fuzzyIncludesCombined(helper["Work Experience"]?.toLowerCase() || "", task.toLowerCase())
        ) {
          matched = true;
          reason = "Matched by Work Experience text";
          break;
        }
      }
    }

    // Fallback: Fuzzy search in all profile text
    if (!matched && fuzzyIncludesCombined(helperProfile, task.toLowerCase())) {
      matched = true;
      reason = "Matched by helper profile text";
    }

    if (matched) {
      matchedTasks.push(task);
      reasons[task] = reason;
    } else {
      missingTasks.push(task);
    }
  });

  return { matchedTasks, missingTasks, reasons };
}

import Fuse from "fuse.js";

// --- Helper: Fuzzy string search ---
function fuzzyIncludes(haystack: string, needle: string, threshold = 0.3) {
  if (!haystack || !needle) return false;
  const fuse = new Fuse([{ text: haystack }], {
    keys: ['text'],
    threshold: threshold,
    minMatchCharLength: Math.max(needle.length - 2, 3),
    includeScore: false,
  });
  return fuse.search(needle).length > 0;
}

// --- JOBSCOPE FIELD MAPPING ---
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
    columns: [
      "Work Experience"
    ]
  },
  {
    keywords: ["cooking", "cook"],
    columns: [
      "Work Experience"
    ]
  },
  {
    keywords: ["caregiver", "nursing"],
    columns: [
      "Care Giver/Nursing aid Cert (Yes/No)"
    ],
    yesValue: "YES"
  },
  {
    keywords: ["pet care", "dog care", "cat care", "pets", "pet"],
    columns: [
      "Work Experience"
    ]
  },
  {
    keywords: ["laundry", "washing clothes", "ironing"],
    columns: [
      "Work Experience"
    ]
  },
  {
    keywords: ["marketing", "grocery shopping"],
    columns: [
      "Work Experience"
    ]
  },
  {
    keywords: ["change diaper", "change diapers", "diaper"],
    columns: [
      "Work Experience"
    ]
  },
  // Extend with more mappings if needed
];

export function jobscopeMatcher(employerJobscope: string[], helper: any) {
  const matchedTasks: string[] = [];
  const missingTasks: string[] = [];

  employerJobscope.forEach(task => {
    let matched = false;
    for (const mapping of JOBSCOPE_FIELD_MAP) {
      if (mapping.keywords.some(keyword =>
        fuzzyIncludes(task.toLowerCase(), keyword, 0.3) ||
        fuzzyIncludes(keyword, task.toLowerCase(), 0.3)
      )) {
        // Check structured fields
        if (mapping.columns.some(col =>
          helper[col] &&
          (!mapping.yesValue || String(helper[col]).toUpperCase() === mapping.yesValue)
        )) {
          matched = true;
          break;
        }
        // Or: fuzzy match in Work Experience text (if column exists)
        if (
          mapping.columns.includes("Work Experience") &&
          fuzzyIncludes(helper["Work Experience"]?.toLowerCase() || "", task.toLowerCase(), 0.3)
        ) {
          matched = true;
          break;
        }
      }
    }
    if (matched) {
      matchedTasks.push(task);
    } else {
      missingTasks.push(task);
    }
  });

  return { matchedTasks, missingTasks };
}

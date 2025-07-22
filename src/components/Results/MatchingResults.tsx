import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  User,
  Globe,
  Star,
  Calendar,
  DollarSign,
  RefreshCw,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import type { MatchResult, Helper, EmployerRequirements } from "../../types";

function parseExperiencePeriods(workExpText: string) {
  const regex = /\(\s*(\d+)\s*Year[s]?(?:\s*(\d+)\s*Month[s]?)?\s*\)|\(\s*(\d+)\s*Month[s]?\s*\)|\(\s*(\d+)\s*day[s]?\s*\)/gi;
  let totalMonths = 0;
  let totalDays = 0;
  let match;

  while ((match = regex.exec(workExpText)) !== null) {
    if (match[1]) {
      const years = parseInt(match[1], 10) || 0;
      const months = parseInt(match[2], 10) || 0;
      totalMonths += years * 12 + months;
    } else if (match[3]) {
      const months = parseInt(match[3], 10) || 0;
      totalMonths += months;
    } else if (match[4]) {
      const days = parseInt(match[4], 10) || 0;
      totalDays += days;
    }
  }
  totalMonths += totalDays / 30;

  return {
    months: +(totalMonths).toFixed(1),
    years: +(totalMonths / 12).toFixed(1),
  };
}

function normalizeExcludedBios(field: any): string[] {
  if (!field) return [];
  if (Array.isArray(field)) return field.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof field === "string") {
    return field
      .split(/[\n,]/)
      .map(s => s.trim())
      .filter(Boolean);
  }
  return [String(field).trim()];
}

interface MatchCriterion {
  name?: string;
  criteria?: string;
  status?: string;
  reason?: string;
  weight?: number;
  [key: string]: any;
}

function getEmployerRequestedCriteria(employer: any, matchResult: any) {
  const employerCriteriaFields = [
    // Household Details
    { key: "Household Type", rule: "Household Type", category: "Household Details" },
    { key: "No. of Children", rule: "Number of Children", category: "Household Details" },
    { key: "No. of Elderly", rule: "Number of Elderly", category: "Household Details" },
    // Job Scope
    { key: "Job Scope", rule: "Job Scope", category: "Job Scope" },
    { key: "Special Skills", rule: "Special Skills", category: "Job Scope" },
    // Preferences
    { key: "Nationality preference", rule: "Nationality", category: "Preferences" },
    { key: "Prefer helper English Level", rule: "English Level", category: "Preferences" },
    { key: "Prefer Helper Height (cm)", rule: "Height", category: "Preferences" },
    { key: "Prefer Helper Weight (kg)", rule: "Weight", category: "Preferences" },
    { key: "Salary and placement budget", rule: "Salary", category: "Preferences" },
    { key: "Prefer helper Religion", rule: "Religion", category: "Preferences" },
    { key: "Prefer helper Education", rule: "Education", category: "Preferences" },
    { key: "Prefer helper Marital Status", rule: "Marital Status", category: "Preferences" },
    { key: "No. of Off Day", rule: "Off Days", category: "Preferences" },
    { key: "When do you need the helper", rule: "Passport Readiness", category: "Preferences" },
  ];

  const requested = employerCriteriaFields
    .filter(({ key }) => {
      const value = employer[key];
      if (Array.isArray(value)) return value.length > 0 && value.some(v => String(v).trim() !== "");
      return value && String(value).trim() !== "";
    })
    .map(({ rule, category }) => ({ rule, category }));

  const requestedCriteria = (matchResult.matches || [])
    .filter((crit: MatchCriterion) => {
      const critName = crit.criteria || crit.name;
      return critName && requested.some(r => r.rule === critName);
    })
    .map((crit: MatchCriterion) => ({
      ...crit,
      name: crit.name || crit.criteria,
      category: requested.find(r => r.rule === (crit.criteria || crit.name))?.category || "Preferences",
    }));

  requestedCriteria.sort((a: MatchCriterion, b: MatchCriterion) => {
    if (a.status === "match" && b.status !== "match") return -1;
    if (a.status !== "match" && b.status === "match") return 1;
    return (b.weight || 1) - (a.weight || 1);
  });

  return requestedCriteria.slice(0, 3);
}

interface MatchingResultsProps {
  requirements: EmployerRequirements;
  excludedBios: string[];
  onRegenerate: () => void;
  onBack: () => void;
  onSuggestedHelpers: (helpers: Helper[]) => void;
  onViewProfile: (helper: Helper) => void;
  results?: MatchResult[];
}

export const MatchingResults: React.FC<MatchingResultsProps> = ({
  requirements,
  excludedBios,
  onRegenerate,
  onBack,
  onSuggestedHelpers,
  onViewProfile,
  results = [],
}) => {
  const [expandedHelpers, setExpandedHelpers] = useState<{ [key: number]: boolean }>({});

  const excludedBiosFromForm = normalizeExcludedBios(excludedBios);

  // Filter available helpers
  const availableResults = useMemo(() => {
    if (!Array.isArray(results)) return [];
    return results.filter(r => {
      const helper = r.helper || {};
      const avail = helper["Availability"];
      const code = helper["Code"] || "";
      if (typeof avail !== "string" || avail.trim().toLowerCase() !== "yes") return false;
      if (excludedBiosFromForm.includes(code)) return false;

      if (requirements.nationalityPreferences && requirements.nationalityPreferences.length > 0) {
        const hNat = (helper["Nationality"] || "").toLowerCase().trim();
        const nats = requirements.nationalityPreferences.map((n: string) => n.toLowerCase().trim());
        if (!nats.includes(hNat)) return false;
      }

      if (requirements.agePreference && helper["Age"]) {
        let minAge = 0, maxAge = 99;
        const agePref = requirements.agePreference;
        const ageStr = agePref.replace(/[^0-9\-]/g, '');
        if (agePref.toLowerCase().includes('above')) minAge = parseInt(ageStr) || 0;
        else if (agePref.toLowerCase().includes('below')) maxAge = parseInt(ageStr) || 99;
        else if (agePref.includes('-')) {
          const parts = agePref.split('-').map((s: string) => parseInt(s));
          minAge = parts[0] || 0;
          maxAge = parts[1] || 99;
        }
        const hAge = parseInt(String(helper["Age"]));
        if (isNaN(hAge) || hAge < minAge || hAge > maxAge) return false;
      }

      if (requirements.budget && helper["Salary"]) {
        const budget = requirements.budget.replace(/[^0-9\-]/g, '');
        let minSalary = 0, maxSalary = 99999;
        if (requirements.budget.toLowerCase().includes('below')) maxSalary = parseInt(budget) || 99999;
        else if (requirements.budget.toLowerCase().includes('above')) minSalary = parseInt(budget) || 0;
        else if (requirements.budget.includes('-')) {
          const parts = requirements.budget.split('-').map((s: string) => parseInt(s));
          minSalary = parts[0] || 0;
          maxSalary = parts[1] || 99999;
        } else if (budget) minSalary = maxSalary = parseInt(budget);
        const hSalary = parseInt(String(helper["Salary"]));
        if (isNaN(hSalary) || hSalary < minSalary || hSalary > maxSalary) return false;
      }

      if (requirements.heightPreference && helper["Height (cm)"]) {
        let minHeight = 0, maxHeight = 999;
        const hPref = requirements.heightPreference;
        const heightStr = hPref.replace(/[^0-9\-]/g, '');
        if (hPref.toLowerCase().includes('above')) minHeight = parseInt(heightStr) || 0;
        else if (hPref.toLowerCase().includes('below')) maxHeight = parseInt(heightStr) || 999;
        else if (hPref.includes('-')) {
          const parts = hPref.split('-').map((s: string) => parseInt(s));
          minHeight = parts[0] || 0;
          maxHeight = parts[1] || 999;
        }
        const hHeight = parseInt(String(helper["Height (cm)"]));
        if (isNaN(hHeight) || hHeight < minHeight || hHeight > maxHeight) return false;
      }

      if (requirements.weightPreference && helper["Weight (Kg)"]) {
        let minWeight = 0, maxWeight = 9999;
        const wPref = requirements.weightPreference;
        const weightStr = wPref.replace(/[^0-9\-]/g, '');
        if (wPref.toLowerCase().includes('above')) minWeight = parseInt(weightStr) || 0;
        else if (wPref.toLowerCase().includes('below')) maxWeight = parseInt(weightStr) || 9999;
        else if (wPref.includes('-')) {
          const parts = wPref.split('-').map((s: string) => parseInt(s));
          minWeight = parts[0] || 0;
          maxWeight = parts[1] || 9999;
        }
        const hWeight = parseInt(String(helper["Weight (Kg)"]));
        if (isNaN(hWeight) || hWeight < minWeight || hWeight > maxWeight) return false;
      }

      if (requirements.religionPreference && helper["Religion"]) {
        const empRel = String(requirements.religionPreference).toLowerCase().trim();
        const helperRel = String(helper["Religion"]).toLowerCase().trim();
        if (empRel && empRel !== "any" && empRel !== "all" && empRel !== "") {
          if (helperRel !== empRel) return false;
        }
      }

      // Household and Job Scope Filters
      if (requirements.householdType && helper["Household Type"]) {
        const empHousehold = String(requirements.householdType).toLowerCase().trim();
        const helperHousehold = String(helper["Household Type"]).toLowerCase().trim();
        if (empHousehold && empHousehold !== "any" && helperHousehold !== empHousehold) return false;
      }

      if (requirements.numberOfChildren && helper["Experience with Children"]) {
        const reqChildren = parseInt(String(requirements.numberOfChildren));
        const helperChildren = parseInt(String(helper["Experience with Children"]));
        if (isNaN(helperChildren) || helperChildren < reqChildren) return false;
      }

      if (requirements.numberOfElderly && helper["Experience with Elderly"]) {
        const reqElderly = parseInt(String(requirements.numberOfElderly));
        const helperElderly = parseInt(String(helper["Experience with Elderly"]));
        if (isNaN(helperElderly) || helperElderly < reqElderly) return false;
      }

      if (requirements.jobscope && helper["Job Scope"]) {
        const reqScopes = Array.isArray(requirements.jobscope)
          ? requirements.jobscope.map(s => s.toLowerCase().trim())
          : [String(requirements.jobscope).toLowerCase().trim()];
        const helperScopes = Array.isArray(helper["Job Scope"])
          ? helper["Job Scope"].map((s: string) => s.toLowerCase().trim())
          : [String(helper["Job Scope"]).toLowerCase().trim()];
        if (!reqScopes.every(s => s === "any" || helperScopes.includes(s))) return false;
      }

      if (requirements.specialSkills && helper["Special Skills"]) {
        const reqSkills = Array.isArray(requirements.specialSkills)
          ? requirements.specialSkills.map(s => s.toLowerCase().trim())
          : [String(requirements.specialSkills).toLowerCase().trim()];
        const helperSkills = Array.isArray(helper["Special Skills"])
          ? helper["Special Skills"].map((s: string) => s.toLowerCase().trim())
          : [String(helper["Special Skills"]).toLowerCase().trim()];
        if (!reqSkills.every(s => s === "any" || helperSkills.includes(s))) return false;
      }

      return true;
    });
  }, [results, excludedBiosFromForm, requirements]);

  const sortedResults = useMemo(
    () => [...availableResults].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    [availableResults]
  );

  const excludedHelperObjs = useMemo(() => {
    if (!Array.isArray(results)) return [];
    const fromResults = results.filter(r => {
      const helper = r.helper || {};
      const code = helper["Code"] || "";
      return excludedBiosFromForm.includes(code);
    });
    const foundCodes = fromResults.map(r => r.helper?.["Code"]);
    const dummyObjs = excludedBiosFromForm
      .filter(code => !foundCodes.includes(code))
      .map(code => ({
        helper: { "Code": code, "Name": "(Not in current results)" },
      }));
    return [...fromResults, ...dummyObjs];
  }, [results, excludedBiosFromForm]);

  const helpers = useMemo(
    () => (Array.isArray(sortedResults) ? sortedResults.map(r => r.helper).filter(Boolean) : []),
    [sortedResults]
  );
  const prevHelpersRef = useRef<string>("");

  useEffect(() => {
    const prevCodes = prevHelpersRef.current;
    const currentCodes = helpers.map(h => h["Code"]).join(",");
    if (prevCodes !== currentCodes) {
      onSuggestedHelpers(helpers);
      prevHelpersRef.current = currentCodes;
    }
  }, [helpers, onSuggestedHelpers]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "match":
        return <CheckCircle className="h-4 w-4 text-teal-600" />;
      case "partial":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "mismatch":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusSymbol = (status: string) => {
    switch (status) {
      case "match":
        return "✅";
      case "partial":
        return "⚠️";
      case "mismatch":
        return "❌";
      default:
        return "❌";
    }
  };

  const getMatchSummary = (matches: any[] = []) => {
    const fullMatches = matches.filter((m) => m?.status === "match");
    const partialMatches = matches.filter((m) => m?.status === "partial");
    const mismatches = matches.filter((m) => m?.status === "mismatch");
    return {
      full: fullMatches.map((m) => m?.criteria ?? "—"),
      partial: partialMatches.map((m) => m?.criteria ?? "—"),
      missed: mismatches.map((m) => m?.criteria ?? "—"),
    };
  };

  const toggleHelperDetails = (index: number) => {
    setExpandedHelpers(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const customerName = requirements.customerName || (requirements as any)["Name of client"] || "Customer";
  const customerContact = requirements.contact || "Contact";

  if (!Array.isArray(results) || results.length === 0) {
    return (
      <div className="text-center py-12 max-w-5xl mx-auto animate-fade-in">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 max-w-md mx-auto shadow-md">
          <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Available Helpers</h3>
          <p className="text-sm text-gray-600 leading-6 mb-4">
            No helpers are currently available that meet your requirements.
            <br />
            <button
              onClick={onBack}
              className="underline text-orange-500 hover:text-orange-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded text-sm"
              aria-label="Go back to edit requirements"
            >
              Go back
            </button>{" "}
            to adjust your requirements.
          </p>
        </div>
      </div>
    );
  }

  const hasLowScoreMatches = sortedResults.some((r) => typeof r?.score === "number" && r.score < 30);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-300 hover:scale-105 transform text-sm"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          Back
        </button>
        <button
          onClick={onRegenerate}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-300 hover:scale-105 transform text-sm"
          title="Regenerate results, excluding shown helpers"
          aria-label="Regenerate results"
        >
          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
          Regenerate
        </button>
      </div>

      {/* Client Requirements */}
      <div
        className="bg-orange-50 border border-orange-200 rounded-xl p-6 shadow-md animate-fade-in"
        role="region"
        aria-label="Client requirements"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 leading-7">
          <FileText className="h-5 w-5 text-orange-500" aria-hidden="true" />
          Client Requirements
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm leading-6">
          <div>
            <span className="font-semibold text-gray-700">Household Type:</span>{" "}
            <span className="text-teal-600">{requirements.householdType || "Any"}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">No. of Children:</span>{" "}
            <span className="text-teal-600">{requirements.numberOfChildren || "Any"}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">No. of Elderly:</span>{" "}
            <span className="text-teal-600">{requirements.numberOfElderly || "Any"}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Job Scope:</span>{" "}
            <span className="text-teal-600">
              {Array.isArray(requirements.jobscope) && requirements.jobscope.length > 0 ? requirements.jobscope.join(", ") : "Any"}
            </span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Special Skills:</span>{" "}
            <span className="text-teal-600">
              {Array.isArray(requirements.specialSkills) && requirements.specialSkills.length > 0 ? requirements.specialSkills.join(", ") : "Any"}
            </span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Nationality:</span>{" "}
            <span className="text-teal-600">
              {Array.isArray(requirements.nationalityPreferences) && requirements.nationalityPreferences.length > 0
                ? requirements.nationalityPreferences.join(", ")
                : "Any"}
            </span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Age Preference:</span>{" "}
            <span className="text-teal-600">{requirements.agePreference || "Any"}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Budget:</span>{" "}
            <span className="text-teal-600">{requirements.budget || "Any"}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Religion:</span>{" "}
            <span className="text-teal-600">{requirements.religionPreference || "Any"}</span>
          </div>
        </div>
      </div>

      {/* Low Match Score Warning */}
      {hasLowScoreMatches && (
        <div
          className="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-md animate-fade-in"
          role="region"
          aria-label="Low match score warning"
        >
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="h-5 w-5 text-orange-500" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-gray-900 leading-7">Limited Matches Found</h3>
          </div>
          <p className="text-sm text-gray-600 leading-6">
            Some results have lower match scores. Consider adjusting your criteria for better matches.
          </p>
        </div>
      )}

      {/* Top Matches Section */}
      <div
        className="w-full bg-white rounded-xl shadow-md border border-orange-200 animate-fade-in"
        role="region"
        aria-label="Top matches section"
      >
        <div className="px-6 py-4 border-b border-orange-200">
          <h2 className="text-xl font-extrabold text-gray-900 leading-7">
            Top Matches for {customerName} ({customerContact})
          </h2>
        </div>
        <div className="divide-y divide-orange-100">
          {sortedResults.slice(0, 3).map((result, index) => {
            const helper = result?.helper ?? {};
            const matches = Array.isArray(result?.matches) ? result.matches : [];
            const summary = getMatchSummary(matches);
            const workExpText = helper["Work Experience"] || "";
            const experience = parseExperiencePeriods(workExpText);
            const topRequestedCriteria = getEmployerRequestedCriteria(requirements, result);
            const score = typeof result?.score === "number" && typeof result?.maxScore === "number"
              ? (result.score / result.maxScore) * 100
              : 0;

            return (
              <div key={`helper-result-${index}`} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-teal-100 p-2 rounded-lg">
                      <User className="h-5 w-5 text-teal-600" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 leading-7">
                        {helper["Name"] || "N/A"}
                      </h3>
                      <p className="text-sm text-gray-600 leading-6">
                        Helper Code: {helper["Code"] || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="relative group">
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-orange-500" aria-hidden="true" />
                        <span
                          className="text-lg font-semibold text-gray-900 leading-7"
                          aria-describedby={`score-tooltip-${index}`}
                        >
                          {score.toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 leading-6">Match Percentage</p>
                      <div
                        className="mt-1 bg-orange-100 h-2 rounded-full overflow-hidden"
                        role="progressbar"
                        aria-valuenow={score}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Match percentage for ${helper["Name"] || "helper"}: ${score}%`}
                      >
                        <div
                          className="bg-orange-500 h-full transition-all duration-300"
                          style={{ width: `${score}%` }}
                        ></div>
                      </div>
                      <span className="absolute hidden group-hover:block -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-md shadow-md z-10">
                        Match percentage
                      </span>
                    </div>
                  </div>
                </div>

                {/* Collapsible Details */}
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm font-semibold text-orange-500 hover:text-orange-600 mb-4 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded"
                  onClick={() => toggleHelperDetails(index)}
                  aria-expanded={!!expandedHelpers[index]}
                  aria-controls={`helper-details-${index}`}
                >
                  {expandedHelpers[index] ? "Hide Details" : "Show Details"}
                  {expandedHelpers[index] ? (
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>

                {expandedHelpers[index] && (
                  <div id={`helper-details-${index}`} className="space-y-4 animate-fade-in">
                    {/* Top Employer-Requested Criteria */}
                    {topRequestedCriteria.length > 0 && (
                      <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 shadow-md">
                        <div className="font-semibold mb-2 text-teal-900 text-sm leading-6">
                          Top Employer-Requested Criteria
                        </div>
                        <ul className="list-disc pl-6 space-y-1 text-sm leading-6">
                          {topRequestedCriteria.map((crit: MatchCriterion & { category?: string }, i: number) => (
                            <li
                              key={i}
                              className={crit.status === "match" ? "text-teal-700" : "text-red-600"}
                              aria-label={`${crit.name}: ${crit.status === "match" ? "Matched" : "Not Matched"}`}
                            >
                              <div className="relative group">
                                <span>
                                  <b>{crit.name}</b> ({crit.category}):{" "}
                                  {crit.status === "match" ? "Matched" : "Not Matched"}
                                  {crit.reason && (
                                    <span className="ml-2 text-gray-600">({crit.reason})</span>
                                  )}
                                </span>
                                {crit.reason && (
                                  <span className="absolute hidden group-hover:block -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-md shadow-md z-10">
                                    {crit.reason}
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Helper Overview */}
                    <div className="bg-teal-50 rounded-xl p-4 shadow-md">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm leading-6">
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-teal-600" aria-hidden="true" />
                          <span>{helper["Nationality"] || "—"}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-teal-600" aria-hidden="true" />
                          <span>{helper["Age"] ? `${helper["Age"]} years` : "—"}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-teal-600" aria-hidden="true" />
                          <span>{experience.years > 0 ? `${experience.years} years` : "—"}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-teal-600" aria-hidden="true" />
                          <span>SGD {helper["Salary"] || "—"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Matching Criteria Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full border border-orange-200 rounded-xl">
                        <thead className="bg-orange-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 leading-6">
                              Criteria
                            </th>
                            <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 leading-6">
                              Status
                            </th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 leading-6">
                              Details
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-orange-100">
                          {(matches.length > 0
                            ? matches
                            : [{ criteria: "—", status: "mismatch", details: "No data" }]).map((match, matchIndex) => (
                              <tr
                                key={`match-row-${matchIndex}`}
                                className="odd:bg-white even:bg-orange-50 hover:bg-teal-50 transition-colors duration-200"
                              >
                                <td className="px-4 py-2 text-sm font-medium text-gray-900 leading-6">
                                  {match?.criteria ?? "—"}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <div className="flex items-center justify-center space-x-1">
                                    {getStatusIcon(match?.status)}
                                    <span className="text-sm">{getStatusSymbol(match?.status)}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-700 leading-6">
                                  {match?.details ?? "—"}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Tailored Summary */}
                    <div
                      className="p-4 bg-teal-50 rounded-xl shadow-md"
                      aria-live="polite"
                    >
                      <h4 className="font-semibold text-teal-900 mb-2 text-sm leading-6">Tailored Summary</h4>
                      <div className="space-y-2 text-sm leading-6">
                        <div className="relative group">
                          <p>
                            <strong>Match Percentage:</strong>{" "}
                            <span id={`score-summary-${index}`}>
                              {score.toFixed(0)}%
                            </span>
                          </p>
                          <span className="absolute hidden group-hover:block -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-md shadow-md z-10">
                            Match percentage
                          </span>
                        </div>
                        {summary.full.length > 0 && (
                          <p>
                            <strong>Strong Matches:</strong>{" "}
                            <span className="text-teal-700">{summary.full.join(", ")}</span>
                          </p>
                        )}
                        {summary.partial.length > 0 && (
                          <p>
                            <strong>Partial Matches:</strong>{" "}
                            <span className="text-orange-600">{summary.partial.join(", ")}</span>
                          </p>
                        )}
                        {summary.missed.length > 0 && (
                          <p>
                            <strong>Not Matched:</strong>{" "}
                            <span className="text-red-600">{summary.missed.join(", ")}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* View Profile Button */}
                    <div className="mt-4 text-right">
                      <button
                        onClick={() => onViewProfile(helper)}
                        className="inline-flex items-center px-3 py-1 bg-teal-100 text-teal-800 rounded-lg hover:bg-teal-200 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-300 hover:scale-105 transform text-sm"
                        aria-label={`View profile for ${helper["Name"] || "helper"}`}
                      >
                        <FileText className="h-4 w-4 mr-1" aria-hidden="true" />
                        View Profile
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Excluded Bios Section */}
      {excludedHelperObjs.length > 0 && (
        <div
          className="w-full bg-white rounded-xl shadow-md border border-red-200 animate-fade-in max-h-[600px] overflow-y-auto"
          role="region"
          aria-label="Excluded bios section"
        >
          <div className="px-6 py-4 border-t border-red-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 leading-7">
              <XCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
              Excluded Bios
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 gap-4">
            {excludedHelperObjs.map((result, idx) => {
              const helper = result?.helper || {};
              return (
                <div
                  key={helper["Code"] || idx}
                  className="bg-red-50 rounded-xl p-4 flex flex-col border border-red-200 hover:bg-red-100 transition-all duration-200"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <User className="h-5 w-5 text-red-600" aria-hidden="true" />
                    <span className="text-sm font-semibold text-gray-900 leading-6">
                      {helper["Name"] || "N/A"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 leading-6 mb-1">
                    <span className="font-semibold">Code:</span> {helper["Code"] || "N/A"}
                  </div>
                  <div className="text-sm text-gray-600 leading-6">
                    <span className="font-semibold">Nationality:</span> {(helper as any)["Nationality"] || "—"}
                    {(helper as any)["Age"] && (
                      <>
                        {" "}
                        | <span className="font-semibold">Age:</span> {(helper as any)["Age"]}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchingResults;
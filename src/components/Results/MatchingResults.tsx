import React, { useEffect, useMemo, useRef } from "react";
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
} from "lucide-react";
import type { MatchResult, Helper, EmployerRequirements } from "../../types";

interface MatchingResultsProps {
  requirements: EmployerRequirements;
  excludedHelpers: string[];
  onRegenerate: () => void;
  onBack: () => void;
  onSuggestedHelpers: (helpers: Helper[]) => void;
  results?: MatchResult[];
}

export const MatchingResults: React.FC<MatchingResultsProps> = ({
  requirements,
  excludedHelpers,
  onRegenerate,
  onBack,
  onSuggestedHelpers,
  results = [],
}) => {
  // Memoize helpers and only update parent if changed (to prevent infinite loop)
  const helpers = useMemo(
    () => (Array.isArray(results) ? results.map(r => r.helper).filter(Boolean) : []),
    [results]
  );
  const prevHelpersRef = useRef<string>("");

  useEffect(() => {
    // Compare helper codes, only call if changed
    const prevCodes = prevHelpersRef.current;
    const currentCodes = helpers.map(h => h.code).join(",");
    if (prevCodes !== currentCodes) {
      onSuggestedHelpers(helpers);
      prevHelpersRef.current = currentCodes;
    }
    // eslint-disable-next-line
  }, [helpers, onSuggestedHelpers]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "match":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "partial":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
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

  const customerName = requirements.customerName || "Customer";
  const customerContact = requirements.contact || "Contact";

  if (!Array.isArray(results) || results.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
          <AlertCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-800 mb-2">No Available Helpers</h3>
          <p className="text-blue-700 mb-4">
            No helpers are currently available that meet your basic requirements.
            <br />
            Please try{" "}
            <button onClick={onBack} className="underline text-blue-600">
              go back
            </button>{" "}
            and adjust your requirements.
          </p>
        </div>
      </div>
    );
  }

  const hasLowScoreMatches = results.some((r) => typeof r?.score === "number" && r.score < 30);

  return (
    <div className="space-y-6">
      {/* Top nav: Back + Regenerate */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="inline-flex items-center px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>
        <button
          onClick={onRegenerate}
          className="inline-flex items-center px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
          title="Regenerate results, excluding shown helpers"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Regenerate
        </button>
      </div>

      {/* Low match score warning */}
      {hasLowScoreMatches && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">Limited Matches Found</h3>
          </div>
          <p className="text-yellow-700 mt-2 text-sm">
            Some results have lower match scores. Consider adjusting your criteria for better matches.
          </p>
        </div>
      )}

      {/* Excluded bios section */}
      {Array.isArray(excludedHelpers) && excludedHelpers.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-2">❌ Excluded bios (previously suggested):</h3>
          <ul className="text-red-700 space-y-1 list-disc pl-4">
            {excludedHelpers.map((bio, idx) => (
              <li key={`excluded-bio-${idx}`}>{bio}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Results Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Top matches for {customerName} ({customerContact})
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {results.slice(0, 3).map((result, index) => {
            const helper = result?.helper ?? {};
            const matches = Array.isArray(result?.matches) ? result.matches : [];
            const summary = getMatchSummary(matches);

            return (
              <div key={`helper-result-${index}`} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {helper.name || "N/A"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Helper Code: {helper.code || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-lg font-semibold text-gray-900">
                        {typeof result?.score === "number" ? (result.score * 100).toFixed(2) : "0"}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Match Score</p>
                  </div>
                </div>

                {/* Helper Overview */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-gray-500" />
                      <span>{helper.nationality || "—"}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span>{helper.age ? `${helper.age} years` : "—"}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>{helper.experience ? `${helper.experience} years exp` : "—"}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span>SGD {helper.salary || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Matching Criteria Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                          Criteria
                        </th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">
                          Score
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                          Data Reference
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(matches.length > 0
                        ? matches
                        : [{ criteria: "—", status: "mismatch", details: "No data" }]
                      ).map((match, matchIndex) => (
                        <tr key={`match-row-${matchIndex}`} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">
                            {match?.criteria ?? "—"}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              {getStatusIcon(match?.status)}
                              <span className="text-sm">{getStatusSymbol(match?.status)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {match?.details ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Tailored Summary */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Tailored Summary:</h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>% Match:</strong> {typeof result?.score === "number" ? result.score : 0}%
                    </p>
                    {summary.full.length > 0 && (
                      <p>
                        <strong>Strong matches:</strong> {summary.full.join(", ")}
                      </p>
                    )}
                    {summary.partial.length > 0 && (
                      <p>
                        <strong>Partial matches:</strong> {summary.partial.join(", ")}
                      </p>
                    )}
                    {summary.missed.length > 0 && (
                      <p>
                        <strong>Not matched:</strong> {summary.missed.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MatchingResults;

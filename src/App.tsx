import React, { useState, useCallback, useEffect } from "react";
import { Header } from "./components/Layout/Header";
import { ContactLookupForm } from "./components/Forms/ContactLookupForm";
import { EmployerRequirementsForm } from "./components/Forms/EmployerRequirementsForm";
import { MatchingResults } from "./components/Results/MatchingResults";
import { MatchingService } from "./services/matchingService";
import { GoogleAppsScriptService } from "./services/GoogleAppsScriptService";
import { mapLookupDataToForm } from "./utils/mapLookupDataToForm";
import { GoogleSheetsService } from "./services/googleSheetsService";
import type { EmployerRequirements, Helper, MatchResult } from "./types";

type Step = "lookup" | "form" | "results";
const gasService = new GoogleAppsScriptService();
const sheetService = new GoogleSheetsService();
const matchingService = new MatchingService();

const App: React.FC = () => {
  const [step, setStep] = useState<Step>("lookup");
  const [requirements, setRequirements] = useState<EmployerRequirements | null>(null);
  const [formData, setFormData] = useState<Partial<EmployerRequirements>>({});
  const [lastSuggestedHelpers, setLastSuggestedHelpers] = useState<Helper[]>([]);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string>("");

  // Load stored API key on first mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem("google_sheets_api_key");
    if (storedApiKey) {
      setApiKey(storedApiKey);
      (window as any).VITE_GOOGLE_SHEETS_API_KEY = storedApiKey;
    }
  }, []);

  // Lookup handler
  const handleLookupContact = async (phone: string, cso: string) => {
    setIsLoading(true);
    try {
      const data = await gasService.getOpportunityByContact(phone, cso);
      setIsLoading(false);
      return data;
    } catch {
      setIsLoading(false);
      return { error: true, message: "Error looking up contact." };
    }
  };

  // After lookup found
  const handleContactFound = async (rawData: EmployerRequirements) => {
    if (!rawData) return;
    const row = Array.isArray(rawData) ? rawData[0] : rawData;
    setFormData(mapLookupDataToForm(row));
    setStep("form");
  };

  // Form submit
  const handleFormSubmit = async (reqs: EmployerRequirements) => {
    const cleanReqs: EmployerRequirements = { ...reqs, excludedBios: reqs.excludedBios ?? [] };
    setRequirements(cleanReqs);
    setStep("results");
    setIsLoading(true);
    const foundResults = await matchingService.findMatches(cleanReqs);
    setResults(foundResults);
    setIsLoading(false);
  };

  // Regenerate matches (exclude top 3 helpers that have been shown)
  const handleRegenerate = useCallback(async () => {
    if (!requirements) return;
    const newExcludes = [
      ...(requirements.excludedBios ?? []),
      ...lastSuggestedHelpers.slice(0, 3).map((h) => h["Code"]),
    ];
    const uniqueExcludes = Array.from(new Set(newExcludes.filter(Boolean)));
    const newReqs: EmployerRequirements = { ...requirements, excludedBios: uniqueExcludes };
    setRequirements(newReqs);
    setIsLoading(true);
    const foundResults = await matchingService.findMatches(newReqs);
    setResults(foundResults);
    setIsLoading(false);
  }, [requirements, lastSuggestedHelpers]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header apiKey={apiKey} />
      <main className="flex-grow max-w-2xl mx-auto p-6">
        {step === "lookup" && (
          <ContactLookupForm
            onContactFound={handleContactFound}
            onLookupContact={handleLookupContact}
            isLoading={isLoading}
            onStartForm={() => setStep("form")}
            sheetService={sheetService}
          />
        )}

        {step === "form" && (
          <EmployerRequirementsForm
            initialData={formData}
            onSubmit={handleFormSubmit}
            onBack={() => setStep("lookup")}
            isLoading={isLoading}
          />
        )}

        {step === "results" && requirements && (
          isLoading ? (
            <div className="text-center py-6 text-blue-500">Loading matches...</div>
          ) : (
            <MatchingResults
              requirements={requirements}
              excludedBios={requirements.excludedBios || []}
              onBack={() => setStep("form")}
              onRegenerate={handleRegenerate}
              onSuggestedHelpers={(helpers: Helper[]) => setLastSuggestedHelpers(helpers)}
              results={results}
            />
          )
        )}
      </main>
    </div>
  );
};

export default App;
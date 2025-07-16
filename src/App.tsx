import React, { useState, useCallback, useEffect } from "react";
import { Header } from "./components/Layout/Header";
import EmployerPage from "./components/Forms/EmployerPage";
import { ContactLookupForm } from "./components/Forms/ContactLookupForm";
import { EmployerRequirementsForm } from "./components/Forms/EmployerRequirementsForm";
import { MatchingResults } from "./components/Results/MatchingResults";
import { MatchingService } from "./services/matchingService";
import type { EmployerRequirements, Helper, MatchResult } from "./types";
import { GoogleAppsScriptService } from "./services/GoogleAppsScriptService";
import { mapLookupDataToForm } from "./utils/mapLookupDataToForm";

type Step = "employer" | "lookup" | "form" | "results";
const gasService = new GoogleAppsScriptService();
const matchingService = new MatchingService();

const App: React.FC = () => {
  const [step, setStep] = useState<Step>("employer");
  const [requirements, setRequirements] = useState<EmployerRequirements | null>(null);
  const [formData, setFormData] = useState<Partial<EmployerRequirements>>({});
  const [excludedHelpers, setExcludedHelpers] = useState<string[]>([]);
  const [lastSuggestedHelpers, setLastSuggestedHelpers] = useState<Helper[]>([]);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string>("");

  // Load stored API key on first mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem('google_sheets_api_key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
      (window as any).VITE_GOOGLE_SHEETS_API_KEY = storedApiKey;
    }
  }, []);

  // Lookup handler
  const handleLookupContact = async (contact: string) => {
    setIsLoading(true);
    try {
      const data = await gasService.getOpportunityByContact(contact);
      setIsLoading(false);
      return data;
    } catch {
      setIsLoading(false);
      return { error: true, message: "Error looking up contact." };
    }
  };

  // After lookup found
  const handleContactFound = (rawData: any) => {
    if (rawData && !rawData.error) {
      setFormData(mapLookupDataToForm(rawData));
      setStep("form");
    }
  };

  // From form submit
  const handleFormSubmit = async (reqs: EmployerRequirements) => {
    setRequirements({ ...reqs, excludedBios: [] });
    setExcludedHelpers([]);
    setStep("results");
    setIsLoading(true);
    const foundResults = await matchingService.findMatches({ ...reqs, excludedBios: [] });
    setResults(foundResults);
    setIsLoading(false);
  };

  // Regenerate matches
  const handleRegenerate = useCallback(async () => {
    if (!requirements) return;
    const newExcludes = [
      ...(requirements.excludedBios || []),
      ...lastSuggestedHelpers.map((h) => h.code),
    ];
    const uniqueExcludes = Array.from(new Set(newExcludes));
    const newReqs = { ...requirements, excludedBios: uniqueExcludes };
    setRequirements(newReqs);
    setExcludedHelpers(uniqueExcludes);
    setIsLoading(true);
    const foundResults = await matchingService.findMatches(newReqs);
    setResults(foundResults);
    setIsLoading(false);
  }, [requirements, lastSuggestedHelpers]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header apiKey={apiKey} />
      <main className="flex-grow max-w-2xl mx-auto p-6">
        {step === "employer" && (
          <EmployerPage
            onStartLookup={() => setStep("lookup")}
            onStartForm={() => setStep("form")}
          />
        )}

        {step === "lookup" && (
          <ContactLookupForm
            onContactFound={handleContactFound}
            onLookupContact={handleLookupContact}
            isLoading={isLoading}
            onBack={() => setStep("employer")}
          />
        )}

        {step === "form" && (
          <EmployerRequirementsForm
            initialData={formData}
            onSubmit={handleFormSubmit}
            onBack={() => setStep("employer")}
            isLoading={isLoading}
          />
        )}

        {step === "results" && requirements && (
          isLoading ? (
            <div className="text-center py-6 text-blue-500">Loading matches...</div>
          ) : (
            <MatchingResults
              requirements={requirements}
              excludedHelpers={excludedHelpers}
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

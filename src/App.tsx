import React, { useState, useCallback, useEffect, useRef } from "react";
import { Header } from "./components/Layout/Header";
import { ContactLookupForm } from "./components/Forms/ContactLookupForm";
import { EmployerRequirementsForm } from "./components/Forms/EmployerRequirementsForm";
import { MatchingResults } from "./components/Results/MatchingResults";
import { MatchingService } from "./services/matchingService";
import { GoogleAppsScriptService } from "./services/GoogleAppsScriptService";
import { GoogleSheetsService } from "./services/googleSheetsService";
import { mapLookupDataToForm } from "./utils/mapLookupDataToForm";
import { X } from "lucide-react";
import type { EmployerRequirements, Helper, MatchResult } from "./types";

type Step = "lookup" | "form" | "results" | "profile";

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
  const [selectedHelper, setSelectedHelper] = useState<Helper | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

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
    const cleanReqs: EmployerRequirements = {
      ...reqs,
      excludedBios: reqs.excludedBios ?? [],
      jobscope: reqs.jobscope, // Map jobscope to jobScope
      householdType: reqs.residenceType, // Map residenceType to householdType
      numberOfChildren: reqs.childrenAges?.length || 0,
      numberOfElderly: reqs.elderlyRelationship ? 1 : 0, // Simplified logic
      specialSkills: reqs.experienceTags, // Map experienceTags to specialSkills
    };
    setRequirements(cleanReqs);
    setStep("results");
    setIsLoading(true);
    const foundResults = await matchingService.findMatches(cleanReqs);
    setResults(foundResults);
    setIsLoading(false);
  };

  // Regenerate matches
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

  // View profile
  const handleViewProfile = (helper: Helper) => {
    setSelectedHelper(helper);
    setStep("profile");
  };

  // Close modal
  const handleCloseModal = () => {
    setSelectedHelper(null);
    setStep("results");
  };

  // Handle back navigation
  const handleBack = () => {
    if (step === "profile") {
      setSelectedHelper(null);
      setStep("results");
    } else if (step === "results") {
      setStep("form");
    } else if (step === "form") {
      setStep("lookup");
    }
  };

  // Focus trap for modal
  useEffect(() => {
    if (step === "profile" && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      firstElement?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Tab") {
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
          const firstElement = focusableElements[0] as HTMLElement;
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
        if (e.key === "Escape") {
          handleCloseModal();
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [step]);

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
            onBack={handleBack}
            isLoading={isLoading}
          />
        )}
        {step === "results" && requirements && (
          isLoading ? (
            <div className="text-center py-6 text-teal-500">Loading matches...</div>
          ) : (
            <MatchingResults
              requirements={requirements}
              excludedBios={requirements.excludedBios || []}
              onBack={handleBack}
              onRegenerate={handleRegenerate}
              onSuggestedHelpers={(helpers: Helper[]) => setLastSuggestedHelpers(helpers)}
              onViewProfile={handleViewProfile}
              results={results}
            />
          )
        )}
        {step === "profile" && selectedHelper && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            role="dialog"
            aria-modal="true"
            aria-label="Helper Profile Modal"
          >
            <div
              ref={modalRef}
              className="bg-white rounded-xl p-6 sm:p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl border border-orange-200 animate-fade-in"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-extrabold text-gray-900">
                  {selectedHelper.Name || "Helper Profile"}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-600 hover:text-gray-800 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded"
                  aria-label="Close profile modal"
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div className="space-y-4 text-sm leading-6">
                <p>
                  <strong>Code:</strong> {selectedHelper.Code || "N/A"}
                </p>
                <p>
                  <strong>Name:</strong> {selectedHelper.Name || "N/A"}
                </p>
                <p>
                  <strong>Nationality:</strong> {selectedHelper.Nationality || "N/A"}
                </p>
                <p>
                  <strong>Age:</strong> {selectedHelper.Age || "N/A"}
                </p>
                <p>
                  <strong>Salary:</strong> SGD {selectedHelper.Salary || "N/A"}
                </p>
                <p>
                  <strong>Work Experience:</strong> {selectedHelper["Work Experience"] || "N/A"}
                </p>
                <p>
                  <strong>Availability:</strong> {selectedHelper.Availability || "N/A"}
                </p>
                <p>
                  <strong>Religion:</strong> {selectedHelper.Religion || "N/A"}
                </p>
                <p>
                  <strong>Education:</strong> {selectedHelper.Education || "N/A"}
                </p>
                <p>
                  <strong>Marital Status:</strong> {selectedHelper["Marital Status"] || "N/A"}
                </p>
                <p>
                  <strong>Weight:</strong> {selectedHelper["Weight (Kg)"] || "N/A"} kg
                </p>
                <p>
                  <strong>Height:</strong> {selectedHelper["Height (cm)"] || "N/A"} cm
                </p>
                <p>
                  <strong>Passport Status:</strong> {selectedHelper["Passport Status"] || "N/A"}
                </p>
                {selectedHelper["Passport Process Date"] && (
                  <p>
                    <strong>Passport Process Date:</strong>{" "}
                    {selectedHelper["Passport Process Date"]}
                  </p>
                )}
                {selectedHelper.Deduction && (
                  <p>
                    <strong>Deduction:</strong> {selectedHelper.Deduction}
                  </p>
                )}
                {selectedHelper.Type && (
                  <p>
                    <strong>Type:</strong> {selectedHelper.Type}
                  </p>
                )}
                {selectedHelper["Helper Exp."] && (
                  <p>
                    <strong>Helper Experience:</strong> {selectedHelper["Helper Exp."]}
                  </p>
                )}
                {selectedHelper.Language && (
                  <p>
                    <strong>Language:</strong> {selectedHelper.Language}
                  </p>
                )}
                <p>
                  <strong>Infant Care (0-6m):</strong>{" "}
                  {selectedHelper["Infant Care Work Experience YES IF 0-6m"] || "N/A"}
                </p>
                <p>
                  <strong>Infant Care (7-12m):</strong>{" "}
                  {selectedHelper["Infant Care Work Experience YES IF 7-12m"] || "N/A"}
                </p>
                <p>
                  <strong>Childcare (1-3y):</strong>{" "}
                  {selectedHelper["Childcare Work Experience YES IF 1-3y"] || "N/A"}
                </p>
                <p>
                  <strong>Childcare (4-6y):</strong>{" "}
                  {selectedHelper["Childcare Work Experience YES IF 4-6y"] || "N/A"}
                </p>
                <p>
                  <strong>Childcare (7-12y):</strong>{" "}
                  {selectedHelper["Childcare Work Experience YES IF 7-12y"] || "N/A"}
                </p>
                <p>
                  <strong>Elderly Care:</strong>{" "}
                  {selectedHelper["Elderly Care Work Experience (Yes/No)"] || "N/A"}
                </p>
                <p>
                  <strong>Caregiver/Nursing Cert:</strong>{" "}
                  {selectedHelper["Care Giver/Nursing aid Cert (Yes/No)"] || "N/A"}
                </p>
                <p>
                  <strong>Personal Infant Care:</strong>{" "}
                  {selectedHelper["Personal Infant Care Experience YES if have same work exp OR OWN CHILDREN <3YO"] || "N/A"}
                </p>
                <p>
                  <strong>Personal Childcare:</strong>{" "}
                  {selectedHelper["Personal Childcare Experience YES if have same work exp OR OWN CHILDREN <6YO"] || "N/A"}
                </p>
                <p>
                  <strong>Personal Elderly Care:</strong>{" "}
                  {selectedHelper["Personal Elderly Care Experience (Yes/No)"] || "N/A"}
                </p>
                {selectedHelper["No. of Child"] && (
                  <p>
                    <strong>Number of Children:</strong> {selectedHelper["No. of Child"]}
                  </p>
                )}
                {selectedHelper["Age of Child"] && (
                  <p>
                    <strong>Age of Children:</strong> {selectedHelper["Age of Child"]}
                  </p>
                )}
                {selectedHelper["Eat Pork"] && (
                  <p>
                    <strong>Eat Pork:</strong> {selectedHelper["Eat Pork"]}
                  </p>
                )}
                {selectedHelper["Handle Pork"] && (
                  <p>
                    <strong>Handle Pork:</strong> {selectedHelper["Handle Pork"]}
                  </p>
                )}
                {selectedHelper["No. of Off Day"] && (
                  <p>
                    <strong>Number of Off Days:</strong> {selectedHelper["No. of Off Day"]}
                  </p>
                )}
                {selectedHelper["Recommendation Remarks"] && (
                  <p>
                    <strong>Recommendation Remarks:</strong>{" "}
                    {selectedHelper["Recommendation Remarks"]}
                  </p>
                )}
                {selectedHelper["Internal Remarks"] && (
                  <p>
                    <strong>Internal Remarks:</strong> {selectedHelper["Internal Remarks"]}
                  </p>
                )}
                {selectedHelper["Additional Remarks"] && (
                  <p>
                    <strong>Additional Remarks:</strong> {selectedHelper["Additional Remarks"]}
                  </p>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-300 hover:scale-105 transform"
                  aria-label="Close profile"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
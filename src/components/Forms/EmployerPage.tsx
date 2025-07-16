import React, { useState } from "react";
import { ContactLookupForm } from "./ContactLookupForm";
import { EmployerRequirementsForm } from "./EmployerRequirementsForm";
import { EmployerRequirements } from "../../types";
import { GoogleAppsScriptService } from "../../services/GoogleAppsScriptService";

// ----------- GAS Service -----------
const gasService = new GoogleAppsScriptService();

// ----------- Mapping Helper -----------

function mapLookupDataToForm(data: any): Partial<EmployerRequirements> {
  return {
    customerName: data["Name of client"] || data.customerName || "",
    contact: data.Contact || data.contact || "",
    email: data.Email || data.email || "",
    referralSource: data["How did they reach us"] || data.referralSource || "",
    employerRace: data["Employer Race"] || data.employerRace || "",
    jobscope: data.Jobscope
      ? (typeof data.Jobscope === "string"
        ? data.Jobscope.replace(/\r?\n/g, ',')
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [])
      : [],
    firstTimeHelper:
      data["First Time Hiring"] === "yes" ||
      data.firstTimeHelper === true ||
      String(data["First Time Hiring"] || "").toLowerCase() === "true",
    childrenAges: data["Age of kids"]
      ? (typeof data["Age of kids"] === "string"
        ? data["Age of kids"]
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [])
      : [],
    elderlyRelationship: data["Relationship of Elderly"] || "",
    pets: data.Pets
      ? (typeof data.Pets === "string"
        ? data.Pets
            .replace(/\r?\n/g, ',')
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [])
      : [],
    residenceType: data["Type of residence"] || "",
    roomSharing:
      data["Room sharing"] === "yes" ||
      data.roomSharing === true ||
      String(data["Room sharing"] || "").toLowerCase() === "true",
    startDate: data["When do you need the helper"] || "",
    preferences: data["Preference remarks"] || "",
    budget: Number(data["Salary and palcement budget"] || 0),
    nationalityPreferences: extractNationalityPrefs(
      data["Nationality preference"],
      data["Preference remarks"]
    ),
    helperType: data["Type of helper"] || "",
    agePreference: data["Prefer helper age"] || "",
    englishRequirement: data["Prefer helper English Level"] || "",
    heightPreference: data["Prefer Helper Height (cm)"] || "",
    weightPreference: data["Prefer Helper Weight (kg)"] || "",
    experienceTags: data["Prefer helper experince in infant/child/elder care"]
      ? data["Prefer helper experince in infant/child/elder care"]
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [],
    religionPreference: data["Prefer helper Religion "] || "",
    educationRequirement: data["Prefer helper Education"] || "",
    maritalPreference: data["Prefer helper Marital Status"] || "",
    helperChildrenAges: data["Prefer helper Children age"] || "",
    excludedBios: data["Bio Sended"]
      ? data["Bio Sended"].split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean)
      : [],
    focusArea: [],
  };
}

// Nationality: combine main field & preference remarks
function extractNationalityPrefs(nationalityValue?: string, remarksValue?: string): string[] {
  // Combine both into a string for matching
  let str = "";
  if (nationalityValue) str += String(nationalityValue) + " ";
  if (remarksValue) str += String(remarksValue);
  str = str.toLowerCase();

  // "any" or "all nationality"
  if (str.includes("any") || str.includes("all nationality")) {
    return ["Indonesia", "Myanmar", "Philippines"];
  }
  // Myanmar and Indonesia together
  if (
    str.includes("myanmar/indonesian") ||
    str.includes("indonesian/myanmar")
  ) return ["Myanmar", "Indonesia"];
  // Myanmar only
  if (
    str.includes("myanmar only") || str.includes("myammar only") ||
    str.includes("myr only") || str.includes("mym only")
  ) return ["Myanmar"];
  // Indonesia only
  if (
    str.includes("indonesian only") || str.includes("indo only") || str.includes("indon only")
  ) return ["Indonesia"];
  // Philippines only
  if (
    str.includes("filipino only") || str.includes("pinoy only")
  ) return ["Philippines"];

  // Contains for each
  const result: string[] = [];
  if (
    str.includes("indonesian") || str.includes("indo") || str.includes("indon")
  ) result.push("Indonesia");
  if (
    str.includes("myanmar") || str.includes("myammar") || str.includes("myr") || str.includes("mym")
  ) result.push("Myanmar");
  if (
    str.includes("filipino") || str.includes("pinoy")
  ) result.push("Philippines");

  // Remove duplicates
  return Array.from(new Set(result));
}

// ----------- Main UI Container -----------

type SelectionType = "lookup" | "form" | null;

interface EmployerPageProps {
  onRequirementsFinalized?: (requirements: EmployerRequirements) => void;
}

export const EmployerPage: React.FC<EmployerPageProps> = ({ onRequirementsFinalized }) => {
  const [customerData, setCustomerData] = useState<Partial<EmployerRequirements>>({});
  const [selection, setSelection] = useState<SelectionType>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleBack = () => {
    setSelection(null);
    setCustomerData({});
  };

  // GAS lookup
  const handleLookupContact = async (contact: string) => {
    setIsLoading(true);
    try {
      const data = await gasService.getOpportunityByContact(contact);
      setIsLoading(false);
      return data;
    } catch (error) {
      setIsLoading(false);
      console.error("Error fetching contact from Google Apps Script:", error);
      return null;
    }
  };

  // When lookup is successful, map and jump to form
  const handleContactFound = (rawData: any) => {
    if (rawData && !rawData.error) {
      setCustomerData(mapLookupDataToForm(rawData));
      setSelection("form");
    }
  };

  // When form submitted, callback up and reset selection
  const handleRequirementsFinalized = (data: EmployerRequirements) => {
    if (onRequirementsFinalized) onRequirementsFinalized(data);
    // (You could reset, or go to dashboard, or just show a confirmation)
  };

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      {!selection && (
        <div className="grid gap-6">
          <h2 className="text-2xl font-bold text-center mb-4">
            How would you like to match a helper?
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              onClick={() => setSelection("lookup")}
              className="rounded-2xl border shadow p-8 text-lg font-semibold hover:bg-blue-50 transition"
            >
              Quick Customer Lookup
              <div className="text-sm font-normal mt-2 text-gray-500">
                Fast search for existing customers
              </div>
            </button>
            <button
              onClick={() => setSelection("form")}
              className="rounded-2xl border shadow p-8 text-lg font-semibold hover:bg-blue-50 transition"
            >
              Employer Requirements Form
              <div className="text-sm font-normal mt-2 text-gray-500">
                Fill details for custom matching
              </div>
            </button>
          </div>
        </div>
      )}

      {selection === "lookup" && (
        <div>
          <button
            onClick={handleBack}
            className="mb-4 text-sm text-blue-500 hover:underline"
          >
            &larr; Back
          </button>
          <ContactLookupForm
            onContactFound={handleContactFound}
            onLookupContact={handleLookupContact}
            isLoading={isLoading}
          />
        </div>
      )}

      {selection === "form" && (
        <div>
          <button
            onClick={handleBack}
            className="mb-4 text-sm text-blue-500 hover:underline"
          >
            &larr; Back
          </button>
          <EmployerRequirementsForm
            initialData={customerData}
            onSubmit={handleRequirementsFinalized}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
};

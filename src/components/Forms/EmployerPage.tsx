import React, { useState } from 'react';
import { ContactLookupForm } from './ContactLookupForm';
import { EmployerRequirementsForm } from './EmployerRequirementsForm';
import { EmployerRequirements } from '../../types';

// ----------- Mapping helpers -----------

function mapReferralSource(source?: string) {
  if (!source) return "";
  const s = source.toLowerCase();
  if (s.includes("referral")) return "referral";
  if (s.includes("google")) return "google";
  if (s.includes("facebook")) return "facebook";
  if (s.includes("instagram")) return "instagram";
  if (s.includes("website")) return "other";
  return "other";
}

function mapJobscope(arr: any) {
  if (!Array.isArray(arr)) return [];
  const scope: string[] = [];
  const str = arr.join(" ").toLowerCase();
  if (str.includes("cooking")) scope.push("cooking");
  if (str.includes("child") || str.includes("kid")) scope.push("childcare");
  if (str.includes("elder")) scope.push("eldercare");
  if (str.includes("housework") || str.includes("clean")) scope.push("housework");
  return Array.from(new Set(scope));
}

function mapChildrenAges(arr: any) {
  if (!Array.isArray(arr)) return [];
  return arr.map(a => {
    if (typeof a !== "string") return a;
    const aa = a.toLowerCase();
    if (aa.includes("newborn") || aa.includes("0")) return "0-1";
    if (aa.includes("2") || aa.includes("3")) return "2-3";
    if (aa.includes("4") || aa.includes("5")) return "4-5";
    if (aa.includes("6") || aa.includes("8")) return "6-8";
    if (aa.includes("9") || aa.includes("12")) return "9-12";
    if (aa.includes("13")) return "13+";
    return a;
  });
}

function mapPets(arr: any) {
  if (!Array.isArray(arr)) return [];
  return arr.map(pet => {
    if (typeof pet !== "string") return pet;
    const petStr = pet.toLowerCase();
    if (petStr.includes("dog")) return "dogs";
    if (petStr.includes("cat")) return "cats";
    if (petStr.includes("bird")) return "birds";
    return "others";
  });
}

function mapResidenceType(val?: string) {
  if (!val) return "";
  const s = val.toLowerCase();
  if (s.includes("hdb")) return "hdb";
  if (s.includes("condo")) return "condo";
  if (s.includes("landed")) return "landed";
  return "";
}

function mapLookupDataToForm(data: any): Partial<EmployerRequirements> {
  return {
    customerName: data._name_of_client || "",
    contact: data.contact || "",
    email: data.email || "",
    referralSource: mapReferralSource(data.referralSource),
    employerRace: (data.employerRace || "").toLowerCase(),
    jobscope: mapJobscope(data.jobscope),
    firstTimeHelper: !!data.firstTimeHelper,
    childrenAges: mapChildrenAges(data.childrenAges),
    elderlyRelationship: data.elderlyRelationship || "",
    pets: mapPets(data.pets),
    residenceType: mapResidenceType(data.residenceType),
    roomSharing: !!data.roomSharing,
    startDate: data.startDate || "",
    preferences: data.overall_remark || "",
    budget: data.budget || 0,
    nationalityPreferences: [],
    helperType: "",
    agePreference: "",
    englishRequirement: "",
    heightPreference: "",
    weightPreference: "",
    experienceTags: [],
    religionPreference: "",
    educationRequirement: "",
    maritalPreference: "",
    helperChildrenAges: "",
    focusArea: [],
    excludedBios: [],
  };
}

// ----------- Dummy async lookup (replace with your API call) -----------
async function onLookupContact(contact: string): Promise<any> {
  // Replace with your real lookup logic (API call, etc)
  return {
    _name_of_client: "Limin Ho",
    contact: "96218660",
    email: "",
    referralSource: "Website",
    employerRace: "chinese",
    jobscope: [
      "- 2 adults (husband",
      "wife) + 1 kid (newborn)\n- Mainly to take care newborn\n- Need to do cooking\n- Need to take care dog"
    ],
    firstTimeHelper: true,
    childrenAges: ["newborn"],
    elderlyRelationship: "no",
    pets: ["1 dog"],
    residenceType: "HDB (2 bedrooms)",
    roomSharing: false,
    startDate: "ASAP",
    overall_remark: "Requirement notes...",
    budget: 900
  };
}

// ----------- The Parent Container Page -----------

export const EmployerPage: React.FC = () => {
  const [customerData, setCustomerData] = useState<Partial<EmployerRequirements>>({});

  return (
    <div className="space-y-8 max-w-3xl mx-auto py-8">
      <ContactLookupForm
        onContactFound={rawData => setCustomerData(mapLookupDataToForm(rawData))}
        onLookupContact={onLookupContact}
      />
      <EmployerRequirementsForm
        initialData={customerData}
        onSubmit={data => {
          // Handle final form submission here
          console.log("Final form submit:", data);
        }}
      />
    </div>
  );
};

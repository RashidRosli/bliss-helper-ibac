import React, { useState, useEffect } from "react";
import { EmployerRequirements } from "../../types";
import { extractJobscopeTagsFromText } from "../../utils/jobscopeParser";

export interface EmployerRequirementsFormProps {
  initialData?: Partial<EmployerRequirements>;
  onSubmit: (requirements: EmployerRequirements) => void;
  isLoading?: boolean;
  onBack?: () => void;
}

// Helper for handling multi-value fields (for all EXCEPT jobscope)
function parseMultiField(val: any): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === "string" && val.includes("\n"))
    return val.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (typeof val === "string" && val.includes(","))
    return val.split(",").map(s => s.trim()).filter(Boolean);
  if (val) return [String(val).trim()];
  return [];
}

// Helper for splitting jobscope lines (NEW: no comma splitting!)
function splitJobscopeLines(value: string): string[] {
  return value
    .split(/[\r\n]+|(?:^|\s)[\-•–]\s?/)
    .map(s => s.trim())
    .filter(Boolean);
}

export const EmployerRequirementsForm: React.FC<EmployerRequirementsFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
  onBack
}) => {
  const defaultFields: EmployerRequirements = {
    customerName: "",
    contact: "",
    email: "",
    referralSource: "",
    employerRace: "",
    jobscope: [],
    jobscopeLines: [],
    jobscopeFacts: {},
    firstTimeHelper: false,
    childrenAges: [],
    elderlyRelationship: "",
    pets: [],
    petsRaw: [],
    residenceType: "",
    roomSharing: false,
    startDate: "",
    preferences: "",
    budget: "",
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

  // --- FORM STATE ---
  const [formData, setFormData] = useState<EmployerRequirements>(() => ({
    ...defaultFields,
    ...initialData,
    jobscope: parseMultiField(initialData?.jobscope),
    jobscopeLines: parseMultiField(initialData?.jobscopeLines),
    childrenAges: parseMultiField(initialData?.childrenAges),
    pets: parseMultiField(initialData?.pets),
    petsRaw: parseMultiField(initialData?.petsRaw),
    nationalityPreferences: parseMultiField(initialData?.nationalityPreferences),
    experienceTags: parseMultiField(initialData?.experienceTags),
    focusArea: parseMultiField(initialData?.focusArea),
    excludedBios: parseMultiField(initialData?.excludedBios),
  }));

  // --- JOBSCOPE (user text + auto tags) ---
  const [jobscopeInput, setJobscopeInput] = useState<string>(
    Array.isArray(initialData?.jobscopeLines)
      ? initialData.jobscopeLines.join("\n")
      : Array.isArray(initialData?.jobscope)
        ? initialData.jobscope.join("\n")
        : typeof initialData?.jobscope === "string"
          ? initialData.jobscope
          : ""
  );
  const [jobscopeTags, setJobscopeTags] = useState<string[]>([]);

  useEffect(() => {
    setJobscopeTags(extractJobscopeTagsFromText(jobscopeInput));
  }, [jobscopeInput]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...defaultFields,
        ...initialData,
        jobscope: parseMultiField(initialData.jobscope),
        jobscopeLines: parseMultiField(initialData.jobscopeLines),
        childrenAges: parseMultiField(initialData.childrenAges),
        pets: parseMultiField(initialData.pets),
        petsRaw: parseMultiField(initialData.petsRaw),
        nationalityPreferences: parseMultiField(initialData.nationalityPreferences),
        experienceTags: parseMultiField(initialData.experienceTags),
        focusArea: parseMultiField(initialData.focusArea),
        excludedBios: parseMultiField(initialData.excludedBios),
      });
      setJobscopeInput(
        Array.isArray(initialData.jobscopeLines)
          ? initialData.jobscopeLines.join("\n")
          : Array.isArray(initialData.jobscope)
            ? initialData.jobscope.join("\n")
            : typeof initialData.jobscope === "string"
              ? initialData.jobscope
              : ""
      );
    }
    // eslint-disable-next-line
  }, [JSON.stringify(initialData)]);

  const handleInput = (key: keyof EmployerRequirements, value: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: value,
    }));
  };
  const handleTextarea = (key: keyof EmployerRequirements, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: value.split(/[\r\n•]+|(?:^|\s)[\-–]\s?/).map(s => s.trim()).filter(Boolean)
    }));
  };

  // Jobscope: keep input and tags in sync, use only splitJobscopeLines (no comma)
  const handleJobscopeChange = (value: string) => {
    setJobscopeInput(value);
    setFormData(prev => ({
      ...prev,
      jobscope: extractJobscopeTagsFromText(value),
      jobscopeLines: splitJobscopeLines(value),
    }));
  };

  // Pets: store both raw and normalized
  const handlePetsChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      petsRaw: value.split(/[\r\n•]+|(?:^|\s)[\-–]\s?/).map(s => s.trim()).filter(Boolean),
      pets: value.split(/[\r\n•]+|(?:^|\s)[\-–]\s?/).map(s => s.trim().toLowerCase()).filter(Boolean)
        .map(p => {
          if (p.includes("dog")) return "dog";
          if (p.includes("cat")) return "cat";
          if (p.includes("rabbit")) return "rabbit";
          if (p.includes("bird")) return "bird";
          if (p.includes("pet")) return "pet";
          return p;
        }),
    }));
  };

  // --- SUBMIT ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Always sync tags and lines with input
    onSubmit({
      ...formData,
      jobscope: extractJobscopeTagsFromText(jobscopeInput),
      jobscopeLines: splitJobscopeLines(jobscopeInput),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Name */}
        <div>
          <label className="block text-sm mb-1 font-medium">Name of Client *</label>
          <input
            type="text"
            value={formData.customerName}
            onChange={e => handleInput("customerName", e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          />
        </div>
        {/* Contact */}
        <div>
          <label className="block text-sm mb-1 font-medium">Contact *</label>
          <input
            type="tel"
            value={formData.contact}
            onChange={e => handleInput("contact", e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          />
        </div>
        {/* Email */}
        <div>
          <label className="block text-sm mb-1 font-medium">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={e => handleInput("email", e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          />
        </div>
        {/* Referral Source */}
        <div>
          <label className="block text-sm mb-1 font-medium">Referral Source</label>
          <input
            type="text"
            value={formData.referralSource}
            onChange={e => handleInput("referralSource", e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          />
        </div>
        {/* Employer Race */}
        <div>
          <label className="block text-sm mb-1 font-medium">Employer Race</label>
          <input
            type="text"
            value={formData.employerRace}
            onChange={e => handleInput("employerRace", e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          />
        </div>
        {/* Residence Type */}
        <div>
          <label className="block text-sm mb-1 font-medium">Residence Type</label>
          <input
            type="text"
            value={formData.residenceType}
            onChange={e => handleInput("residenceType", e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Jobscope */}
      <div>
        <label className="block text-sm mb-1 font-medium">
          Jobscope (bullet, dash, or newline; commas are kept)
        </label>
        <textarea
          rows={3}
          value={jobscopeInput}
          onChange={e => handleJobscopeChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          disabled={isLoading}
        />
        {jobscopeTags.length > 0 && (
          <div className="mt-1 text-xs text-blue-700">
            <span className="font-medium">Detected Jobscope Tags:</span>{" "}
            {jobscopeTags.join(", ")}
          </div>
        )}
      </div>

      {/* Children Ages */}
      <div>
        <label className="block text-sm mb-1 font-medium">Children Ages (comma/newline)</label>
        <textarea
          rows={1}
          value={Array.isArray(formData.childrenAges) ? formData.childrenAges.join('\n') : ""}
          onChange={e => handleTextarea("childrenAges", e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          disabled={isLoading}
        />
      </div>

      {/* Pets */}
      <div>
        <label className="block text-sm mb-1 font-medium">Pets (comma/newline)</label>
        <textarea
          rows={1}
          value={Array.isArray(formData.petsRaw) ? formData.petsRaw.join('\n') : ""}
          onChange={e => handlePetsChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          disabled={isLoading}
        />
        {formData.pets.length > 0 && (
          <div className="mt-1 text-xs text-blue-700">
            <span className="font-medium">Detected Pet Types:</span>{" "}
            {Array.from(new Set(formData.pets)).join(", ")}
          </div>
        )}
      </div>

      {/* Room Sharing & First Time Helper */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1 font-medium">Room Sharing (yes/no)</label>
          <input
            type="text"
            value={formData.roomSharing ? "yes" : "no"}
            onChange={e => handleInput("roomSharing", e.target.value.toLowerCase() === "yes")}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm mb-1 font-medium">First Time Hiring? (yes/no)</label>
          <input
            type="text"
            value={formData.firstTimeHelper ? "yes" : "no"}
            onChange={e => handleInput("firstTimeHelper", e.target.value.toLowerCase() === "yes")}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Start Date */}
      <div>
        <label className="block text-sm mb-1 font-medium">Start Date</label>
        <input
          type="text"
          value={formData.startDate}
          onChange={e => handleInput("startDate", e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          disabled={isLoading}
        />
      </div>

      {/* Preferences / Remarks */}
      <div>
        <label className="block text-sm mb-1 font-medium">Preferences / Remarks</label>
        <textarea
          rows={2}
          value={formData.preferences}
          onChange={e => handleInput("preferences", e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          disabled={isLoading}
        />
      </div>

      {/* Budget */}
      <div>
        <label className="block text-sm mb-1 font-medium">Budget (SGD)</label>
        <input
          type="text"
          value={formData.budget || ""}
          onChange={e => handleInput("budget", e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          disabled={isLoading}
        />
      </div>

      {/* Nationality Preferences */}
      <div>
        <label className="block text-sm mb-1 font-medium">Nationality Preferences (comma/newline)</label>
        <textarea
          rows={1}
          value={Array.isArray(formData.nationalityPreferences) ? formData.nationalityPreferences.join('\n') : ""}
          onChange={e => handleTextarea("nationalityPreferences", e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          disabled={isLoading}
        />
      </div>

      {/* Remaining fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1 font-medium">Helper Type</label>
          <input
            type="text"
            value={formData.helperType}
            onChange={e => handleInput("helperType", e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm mb-1 font-medium">Age Preference</label>
          <input
            type="text"
            value={formData.agePreference}
            onChange={e => handleInput("agePreference", e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm mb-1 font-medium">English Requirement</label>
          <input
            type="text"
            value={formData.englishRequirement}
            onChange={e => handleInput("englishRequirement", e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm mb-1 font-medium">Height Preference</label>
          <input
            type="text"
            value={formData.heightPreference}
            onChange={e => handleInput("heightPreference", e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm mb-1 font-medium">Weight Preference</label>
          <input
            type="text"
            value={formData.weightPreference}
            onChange={e => handleInput("weightPreference", e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm mb-1 font-medium">Experience Tags (comma/newline)</label>
          <textarea
            rows={1}
            value={Array.isArray(formData.experienceTags) ? formData.experienceTags.join('\n') : ""}
            onChange={e => handleTextarea("experienceTags", e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm mb-1 font-medium">Religion Preference</label>
          <input
            type="text"
            value={formData.religionPreference}
            onChange={e => handleInput("religionPreference", e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm mb-1 font-medium">Education Requirement</label>
          <input
            type="text"
            value={formData.educationRequirement}
            onChange={e => handleInput("educationRequirement", e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm mb-1 font-medium">Marital Preference</label>
          <input
            type="text"
            value={formData.maritalPreference}
            onChange={e => handleInput("maritalPreference", e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm mb-1 font-medium">Helper Children Ages</label>
          <input
            type="text"
            value={formData.helperChildrenAges}
            onChange={e => handleInput("helperChildrenAges", e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm mb-1 font-medium">Focus Area (comma/newline)</label>
          <textarea
            rows={1}
            value={Array.isArray(formData.focusArea) ? formData.focusArea.join('\n') : ""}
            onChange={e => handleTextarea("focusArea", e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm mb-1 font-medium">Excluded Bios (comma/newline)</label>
          <textarea
            rows={1}
            value={Array.isArray(formData.excludedBios) ? formData.excludedBios.join(', ') : ""}
            onChange={e => handleTextarea("excludedBios", e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 mt-4">
        {onBack && (
          <button
            type="button"
            className="px-4 py-2 bg-gray-200 rounded-md"
            onClick={onBack}
            disabled={isLoading}
          >
            Back
          </button>
        )}
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : "Save & Find Matches"}
        </button>
      </div>
    </form>
  );
};

export default EmployerRequirementsForm;

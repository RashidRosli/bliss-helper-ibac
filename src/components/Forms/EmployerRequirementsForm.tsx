import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Loader2, HelpCircle } from "lucide-react";
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

// Helper for splitting jobscope lines (no comma splitting)
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
  onBack,
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
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [sections, setSections] = useState({
    clientDetails: true,
    household: true,
    preferences: true,
  });

  // --- SECTION TOGGLE ---
  const toggleSection = (section: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // --- VALIDATION ---
  const validateField = (key: keyof EmployerRequirements, value: any): string | null => {
    if (key === "customerName" && !value.trim()) return "Client name is required.";
    if (key === "contact" && !/^[89]\d{7}$/.test(value.trim()))
      return "Enter a valid Singapore phone number (e.g., 91234567).";
    return null;
  };

  // --- INPUT HANDLERS ---
  const handleInput = (key: keyof EmployerRequirements, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    const error = validateField(key, value);
    setErrors(prev => ({ ...prev, [key]: error || "" }));
  };

  const handleTextarea = (key: keyof EmployerRequirements, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: value.split(/[\r\n•]+|(?:^|\s)[\-–]\s?/).map(s => s.trim()).filter(Boolean),
    }));
  };

  const handleJobscopeChange = (value: string) => {
    setJobscopeInput(value);
    setFormData(prev => ({
      ...prev,
      jobscope: extractJobscopeTagsFromText(value),
      jobscopeLines: splitJobscopeLines(value),
    }));
  };

  const handlePetsChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      petsRaw: value.split(/[\r\n•]+|(?:^|\s)[\-–]\s?/).map(s => s.trim()).filter(Boolean),
      pets: value
        .split(/[\r\n•]+|(?:^|\s)[\-–]\s?/)
        .map(s => s.trim().toLowerCase())
        .filter(Boolean)
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

  // --- EFFECTS ---
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
  }, [JSON.stringify(initialData)]);

  // --- SUBMIT ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};
    newErrors.customerName = validateField("customerName", formData.customerName) || "";
    newErrors.contact = validateField("contact", formData.contact) || "";
    setErrors(newErrors);

    if (Object.values(newErrors).some(error => error)) return;

    onSubmit({
      ...formData,
      jobscope: extractJobscopeTagsFromText(jobscopeInput),
      jobscopeLines: splitJobscopeLines(jobscopeInput),
    });
  };

  return (
    <div className="relative bg-white p-6 sm:p-8 rounded-xl shadow-md border border-orange-200 max-w-5xl mx-auto transition-all duration-500 animate-fade-in">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <h3 className="text-2xl font-extrabold text-gray-900">Employer Requirements</h3>
        </div>

        <p className="text-base sm:text-lg text-gray-600 mb-10 leading-relaxed">
          Fill out the details below to specify employer requirements for helper matching. Required fields are marked with *.
        </p>

        {/* Client Details Section */}
        <div className="border-b border-orange-200">
          <button
            type="button"
            className="flex items-center gap-2 text-lg font-semibold text-orange-500 hover:text-orange-600 mb-4 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded"
            onClick={() => toggleSection("clientDetails")}
            aria-expanded={sections.clientDetails}
            aria-controls="client-details-section"
          >
            Client Details
            {sections.clientDetails ? (
              <ChevronUp className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
          {sections.clientDetails && (
            <div id="client-details-section" className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 animate-fade-in">
              {/* Client Name */}
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
                  Name of Client <span className="text-red-500">*</span>
                </label>
                <input
                  id="customerName"
                  type="text"
                  value={formData.customerName}
                  onChange={e => handleInput("customerName", e.target.value)}
                  required
                  aria-required="true"
                  aria-invalid={!!errors.customerName}
                  aria-describedby={errors.customerName ? "customerName-error" : undefined}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base ${
                    errors.customerName ? "border-red-400" : "border-orange-300"
                  } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                  disabled={isLoading}
                />
                {errors.customerName && (
                  <p id="customerName-error" className="mt-2 text-sm text-red-600 flex items-center gap-2" role="alert">
                    {errors.customerName}
                  </p>
                )}
              </div>
              {/* Contact */}
              <div>
                <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-2">
                  Contact <span className="text-red-500">*</span>
                </label>
                <input
                  id="contact"
                  type="tel"
                  value={formData.contact}
                  onChange={e => handleInput("contact", e.target.value)}
                  required
                  aria-required="true"
                  aria-invalid={!!errors.contact}
                  aria-describedby={errors.contact ? "contact-error" : undefined}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base ${
                    errors.contact ? "border-red-400" : "border-orange-300"
                  } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                  disabled={isLoading}
                />
                {errors.contact && (
                  <p id="contact-error" className="mt-2 text-sm text-red-600 flex items-center gap-2" role="alert">
                    {errors.contact}
                  </p>
                )}
              </div>
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={e => handleInput("email", e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              {/* Referral Source */}
              <div>
                <label htmlFor="referralSource" className="block text-sm font-medium text-gray-700 mb-2">
                  Referral Source
                </label>
                <input
                  id="referralSource"
                  type="text"
                  value={formData.referralSource}
                  onChange={e => handleInput("referralSource", e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              {/* Employer Race */}
              <div>
                <label htmlFor="employerRace" className="block text-sm font-medium text-gray-700 mb-2">
                  Employer Race
                </label>
                <input
                  id="employerRace"
                  type="text"
                  value={formData.employerRace}
                  onChange={e => handleInput("employerRace", e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}
        </div>

        {/* Household Section */}
        <div className="border-b border-orange-200">
          <button
            type="button"
            className="flex items-center gap-2 text-lg font-semibold text-orange-500 hover:text-orange-600 mb-4 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded"
            onClick={() => toggleSection("household")}
            aria-expanded={sections.household}
            aria-controls="household-section"
          >
            Household Details
            {sections.household ? (
              <ChevronUp className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
          {sections.household && (
            <div id="household-section" className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 animate-fade-in">
              {/* Residence Type */}
              <div>
                <label htmlFor="residenceType" className="block text-sm font-medium text-gray-700 mb-2">
                  Residence Type
                </label>
                <input
                  id="residenceType"
                  type="text"
                  value={formData.residenceType}
                  onChange={e => handleInput("residenceType", e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              {/* Room Sharing */}
              <div>
                <label htmlFor="roomSharing" className="block text-sm font-medium text-gray-700 mb-2">
                  Room Sharing (Yes/No)
                </label>
                <input
                  id="roomSharing"
                  type="text"
                  value={formData.roomSharing ? "Yes" : "No"}
                  onChange={e => handleInput("roomSharing", e.target.value.toLowerCase() === "yes")}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              {/* First Time Helper */}
              <div>
                <label htmlFor="firstTimeHelper" className="block text-sm font-medium text-gray-700 mb-2">
                  First Time Hiring? (Yes/No)
                </label>
                <input
                  id="firstTimeHelper"
                  type="text"
                  value={formData.firstTimeHelper ? "Yes" : "No"}
                  onChange={e => handleInput("firstTimeHelper", e.target.value.toLowerCase() === "yes")}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              {/* Children Ages */}
              <div>
                <label htmlFor="childrenAges" className="block text-sm font-medium text-gray-700 mb-2">
                  Children Ages (comma/newline)
                </label>
                <textarea
                  id="childrenAges"
                  rows={1}
                  value={Array.isArray(formData.childrenAges) ? formData.childrenAges.join("\n") : ""}
                  onChange={e => handleTextarea("childrenAges", e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              {/* Pets */}
              <div className="relative group">
                <label htmlFor="pets" className="block text-sm font-medium text-gray-700 mb-2">
                  Pets (comma/newline)
                  <HelpCircle className="h-4 w-4 inline-block ml-2 text-gray-500" aria-hidden="true" />
                </label>
                <span className="absolute hidden group-hover:block -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-md shadow-md z-10">
                  Enter pets (e.g., "dog, cat" or one per line)
                </span>
                <textarea
                  id="pets"
                  rows={1}
                  value={Array.isArray(formData.petsRaw) ? formData.petsRaw.join("\n") : ""}
                  onChange={e => handlePetsChange(e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
                {(formData.pets || []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2" aria-live="polite">
                    <span className="text-sm text-teal-600 font-medium">Detected Pet Types:</span>
                    {Array.from(new Set(formData.pets)).map(pet => (
                      <span
                        key={pet}
                        className="inline-block bg-teal-100 text-teal-800 text-xs font-medium px-2 py-1 rounded-full hover:bg-teal-200 transition-colors duration-200"
                      >
                        {pet}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Jobscope Section */}
        <div className="border-b border-orange-200">
          <button
            type="button"
            className="flex items-center gap-2 text-lg font-semibold text-orange-500 hover:text-orange-600 mb-4 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded"
            onClick={() => toggleSection("preferences")}
            aria-expanded={sections.preferences}
            aria-controls="jobscope-section"
          >
            Jobscope & Preferences
            {sections.preferences ? (
              <ChevronUp className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
          {sections.preferences && (
            <div id="jobscope-section" className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 animate-fade-in">
              {/* Jobscope */}
              <div className="md:col-span-2 relative group">
                <label htmlFor="jobscope" className="block text-sm font-medium text-gray-700 mb-2">
                  Jobscope (bullet, dash, or newline)
                  <HelpCircle className="h-4 w-4 inline-block ml-2 text-gray-500" aria-hidden="true" />
                </label>
                <span className="absolute hidden group-hover:block -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-md shadow-md z-10">
                  Enter tasks (e.g., "- Cleaning\n- Cooking" or one per line)
                </span>
                <textarea
                  id="jobscope"
                  rows={3}
                  value={jobscopeInput}
                  onChange={e => handleJobscopeChange(e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
                {jobscopeTags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2" aria-live="polite">
                    <span className="text-sm text-teal-600 font-medium">Detected Jobscope Tags:</span>
                    {jobscopeTags.map(tag => (
                      <span
                        key={tag}
                        className="inline-block bg-teal-100 text-teal-800 text-xs font-medium px-2 py-1 rounded-full hover:bg-teal-200 transition-colors duration-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {/* Start Date */}
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  id="startDate"
                  type="text"
                  value={formData.startDate}
                  onChange={e => handleInput("startDate", e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              {/* Budget */}
              <div>
                <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                  Budget (SGD)
                </label>
                <input
                  id="budget"
                  type="text"
                  value={formData.budget || ""}
                  onChange={e => handleInput("budget", e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              {/* Preferences / Remarks */}
              <div className="md:col-span-2">
                <label htmlFor="preferences" className="block text-sm font-medium text-gray-700 mb-2">
                  Preferences / Remarks
                </label>
                <textarea
                  id="preferences"
                  rows={2}
                  value={formData.preferences}
                  onChange={e => handleInput("preferences", e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              {/* Nationality Preferences */}
              <div>
                <label htmlFor="nationalityPreferences" className="block text-sm font-medium text-gray-700 mb-2">
                  Nationality Preferences (comma/newline)
                </label>
                <textarea
                  id="nationalityPreferences"
                  rows={1}
                  value={Array.isArray(formData.nationalityPreferences) ? formData.nationalityPreferences.join("\n") : ""}
                  onChange={e => handleTextarea("nationalityPreferences", e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              {/* Helper Type */}
              <div>
                <label htmlFor="helperType" className="block text-sm font-medium text-gray-700 mb-2">
                  Helper Type
                </label>
                <input
                  id="helperType"
                  type="text"
                  value={formData.helperType}
                  onChange={e => handleInput("helperType", e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              {/* Age Preference */}
              <div>
                <label htmlFor="agePreference" className="block text-sm font-medium text-gray-700 mb-2">
                  Age Preference
                </label>
                <input
                  id="agePreference"
                  type="text"
                  value={formData.agePreference}
                  onChange={e => handleInput("agePreference", e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              {/* English Requirement */}
              <div>
                <label htmlFor="englishRequirement" className="block text-sm font-medium text-gray-700 mb-2">
                  English Requirement
                </label>
                <input
                  id="englishRequirement"
                  type="text"
                  value={formData.englishRequirement}
                  onChange={e => handleInput("englishRequirement", e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              {/* Height Preference */}
              <div>
                <label htmlFor="heightPreference" className="block text-sm font-medium text-gray-700 mb-2">
                  Height Preference
                </label>
                <input
                  id="heightPreference"
                  type="text"
                  value={formData.heightPreference}
                  onChange={e => handleInput("heightPreference", e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              {/* Weight Preference */}
              <div>
                <label htmlFor="weightPreference" className="block text-sm font-medium text-gray-700 mb-2">
                  Weight Preference
                </label>
                <input
                  id="weightPreference"
                  type="text"
                  value={formData.weightPreference}
                  onChange={e => handleInput("weightPreference", e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              {/* Experience Tags */}
              <div>
                <label htmlFor="experienceTags" className="block text-sm font-medium text-gray-700 mb-2">
                  Experience Tags (comma/newline)
                </label>
                <textarea
                  id="experienceTags"
                  rows={1}
                  value={Array.isArray(formData.experienceTags) ? formData.experienceTags.join("\n") : ""}
                  onChange={e => handleTextarea("experienceTags", e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              {/* Religion Preference */}
              <div>
                <label htmlFor="religionPreference" className="block text-sm font-medium text-gray-700 mb-2">
                  Religion Preference
                </label>
                <input
                  id="religionPreference"
                  type="text"
                  value={formData.religionPreference}
                  onChange={e => handleInput("religionPreference", e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              {/* Education Requirement */}
              <div>
                <label htmlFor="educationRequirement" className="block text-sm font-medium text-gray-700 mb-2">
                  Education Requirement
                </label>
                <input
                  id="educationRequirement"
                  type="text"
                  value={formData.educationRequirement}
                  onChange={e => handleInput("educationRequirement", e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              {/* Marital Preference */}
              <div>
                <label htmlFor="maritalPreference" className="block text-sm font-medium text-gray-700 mb-2">
                  Marital Preference
                </label>
                <input
                  id="maritalPreference"
                  type="text"
                  value={formData.maritalPreference}
                  onChange={e => handleInput("maritalPreference", e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              {/* Helper Children Ages */}
              <div>
                <label htmlFor="helperChildrenAges" className="block text-sm font-medium text-gray-700 mb-2">
                  Helper Children Ages
                </label>
                <input
                  id="helperChildrenAges"
                  type="text"
                  value={formData.helperChildrenAges}
                  onChange={e => handleInput("helperChildrenAges", e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              {/* Focus Area */}
              <div>
                <label htmlFor="focusArea" className="block text-sm font-medium text-gray-700 mb-2">
                  Focus Area (comma/newline)
                </label>
                <textarea
                  id="focusArea"
                  rows={1}
                  value={Array.isArray(formData.focusArea) ? formData.focusArea.join("\n") : ""}
                  onChange={e => handleTextarea("focusArea", e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              {/* Excluded Bios */}
              <div>
                <label htmlFor="excludedBios" className="block text-sm font-medium text-gray-700 mb-2">
                  Excluded Bios (comma/newline)
                </label>
                <textarea
                  id="excludedBios"
                  rows={1}
                  value={Array.isArray(formData.excludedBios) ? formData.excludedBios.join(", ") : ""}
                  onChange={e => handleTextarea("excludedBios", e.target.value)}
                  className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 mt-6">
          {onBack && (
            <button
              type="button"
              className="px-6 py-3 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-300 hover:scale-105 transform"
              onClick={onBack}
              disabled={isLoading}
              aria-label="Go back"
            >
              Back
            </button>
          )}
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 hover:scale-105 transform"
            disabled={isLoading}
            aria-label={isLoading ? "Saving requirements" : "Save and find matches"}
          >
            {isLoading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
            {isLoading ? "Saving..." : "Save & Find Matches"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployerRequirementsForm;
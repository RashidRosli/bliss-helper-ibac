// src/utils/mapLookupDataToForm.ts
import { EmployerRequirements } from "../types";
import { extractNationalityPrefs } from "./extractNationalityPrefs";

export function mapLookupDataToForm(data: any): Partial<EmployerRequirements> {
    return {
        customerName: data["Name of client"] || data.customerName || "",
        contact: data.Contact || data.contact || "",
        email: data.Email || data.email || "",
        referralSource: data["How did they reach us"] || data.referralSource || "",
        employerRace: data["Employer Race"] || data.employerRace || "",
        jobscope: data.Jobscope
            ? (typeof data.Jobscope === "string"
                ? data.Jobscope.replace(/\r?\n/g, ',').split(",").map((s: string) => s.trim()).filter(Boolean)
                : [])
            : [],
        firstTimeHelper:
            data["First Time Hiring"] === "yes" ||
            data.firstTimeHelper === true ||
            String(data["First Time Hiring"] || "").toLowerCase() === "true",
        childrenAges: data["Age of kids"]
            ? (typeof data["Age of kids"] === "string"
                ? data["Age of kids"].split(",").map((s: string) => s.trim()).filter(Boolean)
                : [])
            : [],
        elderlyRelationship: data["Relationship of Elderly"] || "",
        pets: data.Pets
            ? (typeof data.Pets === "string"
                ? data.Pets.replace(/\r?\n/g, ',').split(",").map((s: string) => s.trim()).filter(Boolean)
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
            ? data["Prefer helper experince in infant/child/elder care"].split(",").map((s: string) => s.trim()).filter(Boolean)
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

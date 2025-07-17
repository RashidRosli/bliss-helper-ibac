const API_BASE = "https://api.puter.com/v1";
const MODEL = "gpt-3.5-turbo"; // Puter supports this endpoint

// 1. Helper function to call Puter API for a single match score
async function getMatchingScoreLLM(requirements: string, helperProfile: string): Promise<number> {
    const prompt = `
You are an expert helper-matching assistant for maid agencies. Given the employer requirements and a helper profile, rate the match from 0 (not suitable at all) to 10 (perfect match). 
Only reply with a single number (0-10) and no explanation.

Employer Requirements:
${requirements}

Helper Profile:
${helperProfile}
    `.trim();

    const response = await fetch(`${API_BASE}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                { role: "system", content: "You rate helper profiles for matching employer requirements." },
                { role: "user", content: prompt }
            ],
            temperature: 0.0
        })
    });
    const data = await response.json();
    // Try to extract number from response
    const content = data?.choices?.[0]?.message?.content ?? "";
    const score = parseInt(content.match(/\d+/)?.[0] ?? "0", 10);
    return Math.max(0, Math.min(10, score));
}

// 2. Service class
export class AIMatchingService {
    // Convert helper object to a string summary for the LLM
    private helperToText(helper: any): string {
        return `
Name: ${helper.Name || ""}
Nationality: ${helper.Nationality || ""}
Type: ${helper.Type || ""}
Ex-SG Experience: ${helper["Helper Exp."] || ""}
Age: ${helper.Age || ""}
English: ${helper.Language || ""}
Height: ${helper["Height (cm)"] || ""}
Weight: ${helper["Weight (Kg)"] || ""}
Religion: ${helper.Religion || ""}
Education: ${helper.Education || ""}
Marital Status: ${helper["Marital Status"] || ""}
Children: ${helper["No. of Child"] || ""}
Salary: SGD ${helper.Salary || ""}
Availability: ${helper.Availability || ""}
Passport Status: ${helper["Passport Status"] || ""}
Work Experience: ${helper["Work Experience"] || ""}
Job Scope: ${(helper.jobscope || []).join(', ')}
Notes: ${helper.notes || ""}
        `.replace(/\s+\n/g, "\n").trim();
    }

    // Convert employer requirements object to a string summary for the LLM
    private requirementsToText(requirements: any): string {
        return `
Jobscope: ${requirements.Jobscope || ""}
Preference remarks: ${requirements["Preference remarks"] || ""}
Type of helper: ${requirements["Type of helper"] || ""}
Age of kids: ${requirements["Age of kids"] || ""}
Nationality preference: ${requirements["Nationality preference"] || ""}
English Level: ${requirements["Prefer helper English Level"] || ""}
Height: ${requirements["Prefer Helper Height (cm)"] || ""}
Weight: ${requirements["Prefer Helper Weight (kg)"] || ""}
Salary and placement budget: ${requirements["Salary and placement budget"] || ""}
Religion: ${requirements["Prefer helper Religion"] || ""}
Education: ${requirements["Prefer helper Education"] || ""}
Marital Status: ${requirements["Prefer helper Marital Status"] || ""}
Pets: ${requirements.Pets || ""}
When do you need the helper: ${requirements["When do you need the helper"] || ""}
        `.replace(/\s+\n/g, "\n").trim();
    }

    // Main match function: gets scores for each helper
    public async findMatches(requirements: any, helpers: any[]) {
        const reqText = this.requirementsToText(requirements);

        const matches = await Promise.all(
            helpers.map(async (helper) => {
                const helperText = this.helperToText(helper);
                const score = await getMatchingScoreLLM(reqText, helperText);
                return {
                    helper,
                    score
                };
            })
        );

        // Sort by score descending (highest first)
        matches.sort((a, b) => b.score - a.score);
        return matches;
    }
}

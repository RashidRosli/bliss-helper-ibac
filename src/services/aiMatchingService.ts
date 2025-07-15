import { HfInference } from '@huggingface/inference';
import { Helper, EmployerRequirements } from '../types';

// Initialize Hugging Face client
const hf = new HfInference(import.meta.env.VITE_HUGGING_FACE_API_KEY);
// Or with API Key:
// const hf = new HfInference(process.env.HUGGING_FACE_API_KEY);

export class AIMatchingService {
    // Convert helper data to text
    private helperToText(helper: Helper): string {
        return `
      Nationality: ${helper.nationality}.
      Status: ${helper.status || 'Unknown'}.
      Experience: ${helper.experience} years.
      Age: ${helper.age}.
      English: ${helper.english}.
      Height: ${helper.height} cm.
      Weight: ${helper.weight} kg.
      Religion: ${helper.religion}.
      Education: ${helper.education}.
      Marital Status: ${helper.marital}.
      Children: ${helper.children}.
      Salary: SGD ${helper.salary}.
      Availability: ${helper.availability}.
      Job Scope: ${(helper.jobscope || []).join(', ')}.
      Focus Areas: ${(helper.focus_area || []).join(', ')}.
      Passport Ready: ${helper.passport_ready ? 'Yes' : 'No'}.
      Transfer Ready: ${helper.transfer_ready ? 'Yes' : 'No'}.
      Notes: ${helper.notes || ''}.
    `;
    }

    // Convert employer requirements to text
    private requirementsToText(requirements: EmployerRequirements): string {
        return `
      Job Scope: ${(requirements.jobscope || []).join(', ')}.
      First Time Helper: ${requirements.firstTimeHelper ? 'Yes' : 'No'}.
      Children Ages: ${(requirements.childrenAges || []).join(', ')}.
      Elderly Relationship: ${requirements.elderlyRelationship}.
      Pets: ${(requirements.pets || []).join(', ')}.
      Residence Type: ${requirements.residenceType}.
      Room Sharing: ${requirements.roomSharing ? 'Yes' : 'No'}.
      Start Date: ${requirements.startDate}.
      Preferences: ${requirements.preferences}.
      Budget: SGD ${requirements.budget}.
      Nationality Preferences: ${(requirements.nationalityPreferences || []).join(', ')}.
      Helper Type: ${requirements.helperType}.
      Age Preference: ${requirements.agePreference}.
      English Requirement: ${requirements.englishRequirement}.
      Height Preference: ${requirements.heightPreference}.
      Weight Preference: ${requirements.weightPreference}.
      Experience Tags: ${(requirements.experienceTags || []).join(', ')}.
      Religion Preference: ${requirements.religionPreference}.
      Education Requirement: ${requirements.educationRequirement}.
      Marital Preference: ${requirements.maritalPreference}.
      Helper Children Ages: ${requirements.helperChildrenAges}.
      Focus Areas: ${(requirements.focusArea || []).join(', ')}.
      Employer Race: ${requirements.employerRace}.
      Referral Source: ${requirements.referralSource}.
      Excluded Bios: ${(requirements.excludedBios || []).join(', ')}.
    `;
    }

    // Generate embeddings using Hugging Face API
    private async generateEmbedding(text: string): Promise<number[]> {
        try {
            const response = await hf.featureExtraction({
                model: 'sentence-transformers/all-MiniLM-L6-v2',
                inputs: text
            });

            // Debugging: log the response structure
            // console.log('featureExtraction response:', response);

            if (Array.isArray(response)) {
                // Handle [ [0.1, 0.2, ...] ] or [0.1, 0.2, ...]
                if (Array.isArray(response[0])) {
                    return response[0] as number[];
                }
                return response as number[];
            }
            if (typeof response === 'object' && response !== null && 'embeddings' in response) {
                // Some versions might return { embeddings: [...] }
                return (response as any).embeddings;
            }
            throw new Error('Unexpected response format from feature extraction');
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }

    // Calculate cosine similarity
    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length) {
            throw new Error('Vectors must have the same length for cosine similarity calculation');
        }

        const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
        if (magnitudeA === 0 || magnitudeB === 0) {
            return 0;
        }
        return dotProduct / (magnitudeA * magnitudeB);
    }

    // Find matches based on semantic similarity
    public async findMatches(
        requirements: EmployerRequirements,
        helpers: Helper[]
    ): Promise<{ helper: Helper, score: number }[]> {
        // Exclude empty helpers - using only properties that exist in the Helper interface
        const nonEmptyHelpers = helpers.filter(h =>
            h.name?.trim() || h.code?.trim() || h.availability?.trim() || 
            (h.jobscope && h.jobscope.length > 0) || 
            (h.focus_area && h.focus_area.length > 0) || 
            h.notes?.trim()
        );
        
        // Generate embedding for employer requirements
        const requirementsText = this.requirementsToText(requirements);
        const requirementsEmbedding = await this.generateEmbedding(requirementsText);
    
        // Calculate similarity scores for each helper
        const matches = await Promise.all(nonEmptyHelpers.map(async (helper) => {
            const helperText = this.helperToText(helper);
            const helperEmbedding = await this.generateEmbedding(helperText);
            const similarity = this.cosineSimilarity(requirementsEmbedding, helperEmbedding);
            return { helper, score: similarity };
        }));
    
        // Sort by similarity score (highest first)
        return matches.sort((a, b) => b.score - a.score);
    }
}

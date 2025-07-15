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
      Type: ${helper.status || 'Unknown'}.
      Experience: ${helper.experience} years.
      Age: ${helper.age}.
      Language: ${helper.english}.
      Height: ${helper.height} cm.
      Weight: ${helper.weight} kg.
      Religion: ${helper.religion}.
      Education: ${helper.education}.
      Marital Status: ${helper.marital}.
      Children: ${helper.children}.
      Job Scope: ${(helper.jobscope || []).join(', ')}.
      Notes: ${helper.notes || ''}.
    `;
    }

    // Convert employer requirements to text
    private requirementsToText(requirements: EmployerRequirements): string {
        return `
      Job Scope: ${(requirements.jobscope || []).join(', ')}.
      Has Children Ages: ${(requirements.childrenAges || []).join(', ')}.
      Has Elderly: ${requirements.elderlyRelationship ? 'Yes' : 'No'}.
      Has Pets: ${(requirements.pets && requirements.pets.length > 0) ? 'Yes' : 'No'}.
      Nationality Preferences: ${(requirements.nationalityPreferences || []).join(', ')}.
      Age Preference: ${requirements.agePreference}.
      English Requirement: ${requirements.englishRequirement}.
      Education Requirement: ${requirements.educationRequirement}.
      Experience Tags: ${(requirements.experienceTags || []).join(', ')}.
      Religion Preference: ${requirements.religionPreference}.
      Marital Status Preference: ${requirements.maritalPreference}.
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
        // Generate embedding for employer requirements
        const requirementsText = this.requirementsToText(requirements);
        const requirementsEmbedding = await this.generateEmbedding(requirementsText);

        // Calculate similarity scores for each helper
        const matches = await Promise.all(helpers.map(async (helper) => {
            const helperText = this.helperToText(helper);
            const helperEmbedding = await this.generateEmbedding(helperText);
            const similarity = this.cosineSimilarity(requirementsEmbedding, helperEmbedding);
            return { helper, score: similarity };
        }));

        // Sort by similarity score (highest first)
        return matches.sort((a, b) => b.score - a.score);
    }
}

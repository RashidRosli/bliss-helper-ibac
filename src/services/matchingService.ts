import { GoogleSheetsService } from './googleSheetsService';
import { AIMatchingService } from './aiMatchingService';
import { EmployerRequirements, MatchResult } from '../types';

export class MatchingService {
  private googleSheetsService: GoogleSheetsService;
  private aiMatchingService: AIMatchingService;
  
  constructor() {
    this.googleSheetsService = new GoogleSheetsService();
    this.aiMatchingService = new AIMatchingService();
  }
  
  public async findMatches(requirements: EmployerRequirements): Promise<MatchResult[]> {
    // Load helpers from Google Sheets
    const helpers = await this.googleSheetsService.loadHelpers();
    
    // Use AI matching to find and rank matches
    const aiMatches = await this.aiMatchingService.findMatches(requirements, helpers);
    
    // Convert to MatchResult format
    return aiMatches.map(match => ({
      helper: match.helper,
      score: match.score,
      matches: [{ // Changed from matchReasons to matches array with required structure
        criteria: 'AI Match',
        status: 'match',
        details: `AI Match Score: ${(match.score * 100).toFixed(1)}%`
      }]
    }));
  }
}
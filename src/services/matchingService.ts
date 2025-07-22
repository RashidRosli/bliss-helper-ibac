import { GoogleSheetsService } from './googleSheetsService';
import { rankHelpers } from './manualMatcher'; // Your refactored rule-based matcher!
import { EmployerRequirements, MatchResult } from '../types';

export class MatchingService {
  private googleSheetsService: GoogleSheetsService;

  constructor() {
    this.googleSheetsService = new GoogleSheetsService();
  }

  public async findMatches(requirements: EmployerRequirements): Promise<MatchResult[]> {
    // 1. Load helpers from Google Sheets
    const helpers = await this.googleSheetsService.loadHelpers();

    // 2. Use manual matcher to rank and report
    const manualMatches = rankHelpers(helpers, requirements);

    // 3. Convert to MatchResult format for UI (normalizes scoring and mapping)
    return manualMatches.map(match => ({
      score: match.score * 10, // e.g. 8 => 80% for UI
      maxScore: match.maxScore * 10, // e.g. 10 => 100% for UI
      helper: match.helper,
      similarity: match.score / 10, // e.g. 8 => 0.8 (optional, some UIs use it)
      matches: match.criteria.map(crit => ({
        criteria: crit.name ?? crit.criteria, // Both name and criteria are present in your matcher now
        status: crit.matched ? "match" : "mismatch", // "match", "mismatch", or if you want, add "partial"
        details: crit.reason ?? "",
        value: crit.value,
        weight: crit.weight,
      }))
    }));
  }
}

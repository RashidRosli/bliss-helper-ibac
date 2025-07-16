import { Helper, EmployerRequirements, ValueContent } from '../types';
import { GoogleSheetsService } from './googleSheetsService';

export class PitchService {
  private googleSheetsService: GoogleSheetsService;
  private valueContent: ValueContent[] = [];

  constructor() {
    this.googleSheetsService = new GoogleSheetsService();
  }

  async loadValueContent(): Promise<void> {
    try {
      // Load Value Content sheet for mapping traits to pitch lines
      const contentData = await this.googleSheetsService.getValueContent();
      this.valueContent = contentData;
    } catch (error) {
      console.error('Error loading value content:', error);
      this.valueContent = [];
    }
  }

  // Generate a pitch for a single helper
  async generatePitch(helper: Helper, requirements: EmployerRequirements): Promise<string> {
    if (this.valueContent.length === 0) {
      await this.loadValueContent();
    }

    const relevantTraits = this.identifyRelevantTraits(helper, requirements);
    const valuePhrase = this.buildValuePhrase(relevantTraits);

    return `${helper.name}, a ${helper.nationality} helper with ${valuePhrase}. With ${helper.experience} years of experience, she ${this.getSpecificBenefits(helper, requirements)} Perfect for families seeking ${this.getFamilyBenefits(requirements)}.`;
  }

  // NEW: Generate pitches for the top 3 helpers
  async generatePitches(requirements: EmployerRequirements): Promise<Array<{ name: string; pitch: string }>> {
    // 1. Get all helpers from sheets
    const allHelpers: Helper[] = await this.googleSheetsService.getHelperData();

    // 2. Run basic matching (sort helpers by match to requirements)
    //    This is a basic scoring, you can improve as needed!
    const scored = allHelpers.map(helper => ({
      helper,
      score: this.scoreHelper(helper, requirements)
    }));
    scored.sort((a, b) => b.score - a.score);

    // 3. Take top 3
    const topHelpers = scored.slice(0, 3).map(s => s.helper);

    // 4. Generate a pitch for each
    const pitches = await Promise.all(
      topHelpers.map(async helper => ({
        name: helper.name,
        pitch: await this.generatePitch(helper, requirements)
      }))
    );
    return pitches;
  }

  // Helper scoring function (adjust as needed for your business logic)
  private scoreHelper(helper: Helper, requirements: EmployerRequirements): number {
    let score = 0;
    // Nationality
    if (
      !requirements.nationalityPreferences ||
      requirements.nationalityPreferences.length === 0 ||
      requirements.nationalityPreferences.includes(helper.nationality)
    ) {
      score += 5;
    }
    // Jobscope overlap
    if (helper.jobscope && requirements.jobscope) {
      for (const job of requirements.jobscope) {
        if (helper.jobscope.includes(job)) score += 2;
      }
    }
    // Experience
    score += Math.min(helper.experience, 10);
    // Language
    if (helper.english === 'Very Good' || helper.english === 'Excellent') score += 2;
    return score;
  }

  private identifyRelevantTraits(helper: Helper, requirements: EmployerRequirements): string[] {
    const traits: string[] = [];

    if (helper.experience >= 5) traits.push('experienced');
    if (helper.english === 'Very Good' || helper.english === 'Excellent') traits.push('english_speaking');
    if (helper.education === 'College' || helper.education === 'Diploma') traits.push('college_educated');
    if (helper.transfer_ready) traits.push('transfer_ready');
    else if (helper.passport_ready) traits.push('passport_ready');

    if (helper.focus_area.includes('childcare')) traits.push('childcare_focused');
    if (helper.focus_area.includes('eldercare')) traits.push('eldercare_specialist');
    if (helper.focus_area.includes('cooking')) traits.push('cooking_skills');
    if (helper.notes.toLowerCase().includes('pet')) traits.push('pet_friendly');
    return traits;
  }

  private buildValuePhrase(traits: string[]): string {
    const values = traits.map(trait => {
      const content = this.valueContent.find(v => v.trait === trait);
      return content ? content.value : '';
    }).filter(v => v.length > 0);

    if (values.length === 0) return 'reliable service and dedication';
    if (values.length === 1) return values[0];
    if (values.length === 2) return `${values[0]} and ${values[1]}`;
    return `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`;
  }

  private getSpecificBenefits(helper: Helper, requirements: EmployerRequirements): string {
    const benefits: string[] = [];
    if (requirements.jobscope.includes('childcare') && helper.jobscope.includes('childcare')) {
      benefits.push('provides loving childcare');
    }
    if (requirements.jobscope.includes('eldercare') && helper.jobscope.includes('eldercare')) {
      benefits.push('offers compassionate elderly support');
    }
    if (requirements.jobscope.includes('cooking') && helper.jobscope.includes('cooking')) {
      benefits.push('prepares delicious meals');
    }
    if (benefits.length === 0) return 'brings reliability and dedication to your household';
    if (benefits.length === 1) return benefits[0];
    return `${benefits.slice(0, -1).join(', ')} and ${benefits[benefits.length - 1]}`;
  }

  private getFamilyBenefits(requirements: EmployerRequirements): string {
    const benefits: string[] = [];
    if (requirements.childrenAges.length > 0) benefits.push('quality childcare');
    if (requirements.elderlyRelationship) benefits.push('elderly support');
    if (requirements.jobscope.includes('cooking')) benefits.push('meal preparation');
    if (requirements.firstTimeHelper) benefits.push('guidance and patience');
    if (benefits.length === 0) return 'reliable household support';
    if (benefits.length === 1) return benefits[0];
    return `${benefits.slice(0, -1).join(', ')} and ${benefits[benefits.length - 1]}`;
  }
}

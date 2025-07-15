import { InterviewQuestion, EmployerRequirements } from '../types';
import { GoogleSheetsService } from './googleSheetsService';

export class QuestionService {
  private googleSheetsService: GoogleSheetsService;
  private questions: InterviewQuestion[] = [];

  constructor() {
    this.googleSheetsService = new GoogleSheetsService();
  }

  async loadQuestions(): Promise<void> {
    try {
      console.log('Loading questions from Google Sheets...');
      const questionData = await this.googleSheetsService.getQuestions();
      this.questions = questionData;
      console.log('Loaded questions:', this.questions.length);
    } catch (error) {
      console.error('Error loading questions:', error);
      this.questions = [];
    }
  }

  async generateQuestions(requirements: EmployerRequirements): Promise<Array<{question: string, reason: string}>> {
    // Ensure questions are loaded
    if (this.questions.length === 0) {
      await this.loadQuestions();
    }

    const result: Array<{question: string, reason: string}> = [];
    
    // Add compulsory opening questions
    const openingQuestions = [
      "Can you please introduce yourself to Ma'am and Sir?",
      "Why do you want to work in Singapore?",
      "Are you healthy? Do you need to take medicine every day?"
    ];

    openingQuestions.forEach(q => {
      result.push({
        question: q,
        reason: 'Compulsory opening question'
      });
    });

    // Generate criteria from employer requirements
    const criteria = this.extractCriteria(requirements);
    
    // Select 9 relevant questions from Google Sheets
    const relevantQuestions = this.selectRelevantQuestions(criteria, 9);
    relevantQuestions.forEach(item => {
      result.push(item);
    });

    // Add compulsory closing questions
    const closingQuestions = [
      `Are you okay with ${this.getOffDays(requirements)} offday?`,
      "How many years do you want to work in Singapore?",
      "Who will help to take care of your family if you are working overseas?"
    ];

    closingQuestions.forEach(q => {
      result.push({
        question: q,
        reason: 'Compulsory closing question'
      });
    });

    return result;
  }

  private extractCriteria(requirements: EmployerRequirements): string[] {
    const criteria: string[] = [];
    
    if (requirements.jobscope.includes('childcare')) criteria.push('childcare');
    if (requirements.jobscope.includes('eldercare')) criteria.push('eldercare');
    if (requirements.jobscope.includes('cooking')) criteria.push('cooking');
    if (requirements.jobscope.includes('housework')) criteria.push('housework');
    if (requirements.pets.length > 0) criteria.push('pets');
    if (requirements.childrenAges.some(age => parseInt(age) < 2)) criteria.push('infant');
    if (requirements.childrenAges.some(age => parseInt(age) >= 2 && parseInt(age) <= 5)) criteria.push('toddler');
    if (requirements.elderlyRelationship) criteria.push('elderly');
    
    return criteria;
  }

  private selectRelevantQuestions(criteria: string[], count: number): Array<{question: string, reason: string}> {
    const availableQuestions = this.questions.filter(q => !q.compulsory);
    const selected: Array<{question: string, reason: string}> = [];
    
    // First, select questions that match criteria
    for (const criterion of criteria) {
      if (selected.length >= count) break;
      
      const matchingQuestions = availableQuestions.filter(q => 
        Array.isArray(q.matchFor) && q.matchFor.includes(criterion) && 
        !selected.some(s => s.question === q.question)
      );
      
      if (matchingQuestions.length > 0) {
        const question = matchingQuestions[0];
        selected.push({
          question: question.question,
          reason: `Matches with employer's focus on ${criterion}`
        });
      }
    }
    
    // Fill remaining slots with general questions
    while (selected.length < count) {
      const remaining = availableQuestions.filter(q => 
        !selected.some(s => s.question === q.question)
      );
      
      if (remaining.length === 0) break;
      
      const question = remaining[0];
      selected.push({
        question: question.question,
        reason: `General assessment question`
      });
    }
    
    return selected;
  }

  private getOffDays(_requirements: EmployerRequirements): string {
    // Default to "1 off day per month" if not specified
    return "1 off day per month";
  }
}
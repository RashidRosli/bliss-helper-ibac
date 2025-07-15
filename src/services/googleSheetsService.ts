interface GoogleSheetsConfig {
  apiKey: string;
  helperSheetId: string;
  questionsSheetId: string;
  contentSheetId: string;
}

interface SheetData {
  values: string[][];
}

interface Helper {
  code: string;
  name: string;
  nationality: string;
  age: number;
  experience: number;
  english: string;
  height: number;
  weight: number;
  religion: string;
  education: string;
  marital: string;
  children: string;
  salary: number;
  availability: string;
  status: string;
  jobscope: string[];
  notes: string;
  focus_area: string[];
  passport_ready: boolean;
  transfer_ready: boolean;
}

export class GoogleSheetsService {
  private config: GoogleSheetsConfig;
  private baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';

  constructor() {
    this.config = {
      apiKey: import.meta.env.VITE_GOOGLE_SHEETS_API_KEY || '',
      helperSheetId: '1ohjfGkv9NBGTOQ5hmGizWKOPck9xFaZghBepl02Xch0',
      questionsSheetId: '1kDtQAwEkNW6PTjxOchWYuYKNOnGbwTIULrQsw9SnLmc',
      contentSheetId: '1Lj2nZKcVJMeITFX9StMXdNeXkOAtKZLOpb84X1HH0nE'
    };
  }

  private async fetchSheetData(sheetId: string, range: string): Promise<string[][]> {
    if (!this.config.apiKey) {
      console.warn('Google Sheets API key not configured, using mock data');
      return [];
    }

    const maxRetries = 5;
    let retryCount = 0;
    let retryDelay = 1000; // Start with 1 second delay

    while (retryCount < maxRetries) {
      try {
        const url = `${this.baseUrl}/${sheetId}/values/${range}?key=${this.config.apiKey}`;
        const response = await fetch(url);

        if (response.ok) {
          const data: SheetData = await response.json();
          return data.values || [];
        }

        if (response.status === 429) {
          // Rate limit hit - need to retry after delay
          retryCount++;
          console.log(`Rate limit hit. Retry ${retryCount}/${maxRetries} after ${retryDelay}ms delay`);
          
          // Wait for the delay period
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          
          // Exponential backoff with jitter
          retryDelay = retryDelay * 2 + Math.random() * 1000;
          continue;
        }

        // For other errors, throw
        throw new Error(`HTTP error! status: ${response.status}`);
      } catch (error) {
        if (retryCount >= maxRetries - 1) {
          console.error('Error fetching sheet data after retries:', error);
          return [];
        }
        retryCount++;
        console.log(`Error occurred. Retry ${retryCount}/${maxRetries} after ${retryDelay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retryDelay = retryDelay * 2 + Math.random() * 1000;
      }
    }

    console.error('Max retries reached for fetching sheet data');
    return [];
  }

  private helperDataCache: any[] | null = null;
  private lastFetchTime: number = 0;
  private cacheTTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  async getHelperData(): Promise<any[]> {
    const now = Date.now();
    if (this.helperDataCache && (now - this.lastFetchTime < this.cacheTTL)) {
      console.log('Using cached helper data');
      return this.helperDataCache;
    }

    const data = await this.fetchSheetData(this.config.helperSheetId, 'Helper Masterdata!A:Z');

    if (!Array.isArray(data) || data.length === 0) {
      console.warn('No helper data found, using mock data');
      return this.getMockHelperData();
    }

    const headers = data[0];
    const rows = data.slice(1);
    
    // Update cache
    this.helperDataCache = rows.map(row => this.mapRowToHelper(headers, row));
    this.lastFetchTime = now;
    
    return this.helperDataCache;
  }

  async getQuestions(): Promise<any[]> {
    const data = await this.fetchSheetData(this.config.questionsSheetId, 'Questions!A:Z');

    if (!Array.isArray(data) || data.length === 0) {
      console.warn('No questions data found, using mock data');
      return this.getMockQuestions();
    }

    const headers = data[0];
    const rows = data.slice(1);

    return rows.map(row => {
      const question: any = {};
      headers.forEach((header, index) => {
        const value = row[index] || '';

        const fieldMap: { [key: string]: string } = {
          'ID': 'id',
          'Question': 'question',
          'Category': 'category',
          'Match For': 'matchFor',
          'Compulsory': 'compulsory'
        };

        const fieldName = fieldMap[header] || header.toLowerCase().replace(/\s+/g, '_');

        if (fieldName === 'matchFor') {
          question[fieldName] = value.split(',').map((item: string) => item.trim()).filter((item: string) => item);
        } else if (fieldName === 'compulsory') {
          question[fieldName] = value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
        } else {
          question[fieldName] = value;
        }
      });

      return question;
    });
  }

  async getValueContent(): Promise<any[]> {
    const data = await this.fetchSheetData(this.config.contentSheetId, 'Guided Content!A:Z');

    if (!Array.isArray(data) || data.length === 0) {
      console.warn('No value content data found, using mock data');
      return this.getMockValueContent();
    }

    const headers = data[0];
    const rows = data.slice(1);

    return rows.map(row => {
      const content: any = {};
      headers.forEach((header, index) => {
        const value = row[index] || '';

        const fieldMap: { [key: string]: string } = {
          'Trait': 'trait',
          'Value': 'value',
          'Category': 'category'
        };

        const fieldName = fieldMap[header] || header.toLowerCase().replace(/\s+/g, '_');
        content[fieldName] = value;
      });

      return content;
    });
  }

  // Fallback mock data
  private getMockHelperData(): Helper[] {
    return [
      {
        code: "SG/MYA/2024001",
        name: "Thida",
        nationality: "Myanmar",
        age: 28,
        experience: 5,
        english: "Good",
        height: 155,
        weight: 50,
        religion: "Buddhist",
        education: "High School",
        marital: "Single",
        children: "None",
        salary: 650,
        availability: "Available",
        status: "Passport Ready",
        jobscope: ["housework", "cooking", "childcare", "eldercare"],
        notes: "Experienced with infant care, good with pets",
        focus_area: ["childcare", "cooking"],
        passport_ready: true,
        transfer_ready: false
      },
      {
        code: "SG/IND/2024002",
        name: "Priya",
        nationality: "India",
        age: 32,
        experience: 8,
        english: "Very Good",
        height: 160,
        weight: 55,
        religion: "Hindu",
        education: "Diploma",
        marital: "Married",
        children: "2 children (8, 10)",
        salary: 700,
        availability: "Available",
        status: "Transfer Ready",
        jobscope: ["housework", "cooking", "eldercare"],
        notes: "Specializes in elderly care, vegetarian cooking",
        focus_area: ["eldercare", "cooking"],
        passport_ready: true,
        transfer_ready: true
      },
      {
        code: "SG/PHI/2024003",
        name: "Maria",
        nationality: "Philippines",
        age: 25,
        experience: 3,
        english: "Excellent",
        height: 158,
        weight: 52,
        religion: "Catholic",
        education: "College",
        marital: "Single",
        children: "None",
        salary: 680,
        availability: "Available",
        status: "Passport Ready",
        jobscope: ["housework", "cooking", "childcare"],
        notes: "University graduate, great with children",
        focus_area: ["childcare", "tutoring"],
        passport_ready: true,
        transfer_ready: false
      }
    ];
  }

  private getMockQuestions() {
    return [
      {
        id: "open1",
        question: "Can you please introduce yourself to Ma'am and Sir?",
        category: "Opening",
        matchFor: ["all"],
        compulsory: true
      },
      {
        id: "open2",
        question: "Why do you want to work in Singapore?",
        category: "Opening",
        matchFor: ["all"],
        compulsory: true
      },
      {
        id: "open3",
        question: "Are you healthy? Do you need to take medicine every day?",
        category: "Opening",
        matchFor: ["all"],
        compulsory: true
      },
      {
        id: "child1",
        question: "How do you handle crying babies?",
        category: "Childcare",
        matchFor: ["childcare", "infant"],
        compulsory: false
      },
      {
        id: "elder1",
        question: "How do you assist elderly with mobility issues?",
        category: "Eldercare",
        matchFor: ["eldercare", "elderly"],
        compulsory: false
      }
    ];
  }

  private getMockValueContent() {
    return [
      {
        trait: "experienced",
        value: "brings peace of mind with proven track record",
        category: "experience"
      },
      {
        trait: "english_speaking",
        value: "ensures clear communication and understanding",
        category: "communication"
      },
      {
        trait: "childcare_focused",
        value: "provides nurturing care for your precious ones",
        category: "childcare"
      }
    ];
  }

  /**
   * Safely loads helpers as Helper[]
   */
  async loadHelpers(): Promise<Helper[]> {
    const helperData = await this.getHelperData();
    if (!Array.isArray(helperData)) {
      console.error('helperData is not an array:', helperData);
      return [];
    }
    // Map and type-check for safety
    return helperData.map((helper: any): Helper => ({
      code: helper.code || '',
      name: helper.name || '',
      nationality: helper.nationality || '',
      age: helper.age || 0,
      experience: helper.experience || 0,
      english: helper.english || '',
      height: helper.height || 0,
      weight: helper.weight || 0,
      religion: helper.religion || '',
      education: helper.education || '',
      marital: helper.marital || '',
      children: helper.children || '',
      salary: helper.salary || 0,
      availability: helper.availability || '',
      status: helper.status || '',
      jobscope: Array.isArray(helper.jobscope) ? helper.jobscope : [],
      notes: helper.notes || '',
      focus_area: Array.isArray(helper.focus_area) ? helper.focus_area : [],
      passport_ready: !!helper.passport_ready,
      transfer_ready: !!helper.transfer_ready
    }));
  }

  /**
   * Maps a row from the Google Sheet to a Helper object
   */
  private mapRowToHelper(headers: string[], row: string[]): any {
    const helper: any = {};
    
    // Map each column to the corresponding property
    headers.forEach((header, index) => {
      if (index < row.length) {
        const value = row[index];
        
        // Map headers to helper properties
        switch(header.toLowerCase().trim()) {
          case 'code':
            helper.code = value;
            break;
          case 'name':
            helper.name = value;
            break;
          case 'nationality':
            helper.nationality = value;
            break;
          case 'age':
            helper.age = parseInt(value) || 0;
            break;
          case 'helper exp.':
          case 'experience':
            helper.experience = parseInt(value) || 0;
            break;
          case 'language':
          case 'english':
            helper.english = value;
            break;
          case 'height (cm)':
          case 'height':
            helper.height = parseInt(value) || 0;
            break;
          case 'weight (kg)':
          case 'weight':
            helper.weight = parseInt(value) || 0;
            break;
          case 'religion':
            helper.religion = value;
            break;
          case 'education':
            helper.education = value;
            break;
          case 'marital':
          case 'marital status':
            helper.marital = value;
            break;
          case 'children':
            helper.children = value;
            break;
          case 'salary':
            helper.salary = parseInt(value) || 0;
            break;
          case 'availability':
            helper.availability = value;
            break;
          case 'status':
            helper.status = value;
            break;
          case 'work experience':
          case 'notes':
            helper.notes = value;
            break;
          // Add any other fields you need to map
        }
      }
    });
    
    // Set default values for arrays and other complex types
    helper.jobscope = helper.jobscope || [];
    helper.focus_area = helper.focus_area || [];
    helper.passport_ready = !!helper.passport_ready;
    helper.transfer_ready = !!helper.transfer_ready;
    
    return helper;
  }
}

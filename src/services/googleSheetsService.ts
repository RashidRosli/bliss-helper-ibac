// --- Types ---
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

// --- Main Service ---
export class GoogleSheetsService {
  private config: GoogleSheetsConfig = {
    apiKey: import.meta.env.VITE_GOOGLE_SHEETS_API_KEY || '',
    helperSheetId: '1ohjfGkv9NBGTOQ5hmGizWKOPck9xFaZghBepl02Xch0',
    questionsSheetId: '1kDtQAwEkNW6PTjxOchWYuYKNOnGbwTIULrQsw9SnLmc',
    contentSheetId: '1Lj2nZKcVJMeITFX9StMXdNeXkOAtKZLOpb84X1HH0nE',
  };

  private baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  private helperDataCache: Helper[] | null = null;
  private lastFetchTime: number = 0;
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  // --- Sheet Fetching with Retry/Backoff ---
  private async fetchSheetData(sheetId: string, range: string): Promise<string[][]> {
    if (!this.config.apiKey) {
      console.warn('Google Sheets API key not configured');
      return [];
    }
    const maxRetries = 5;
    let retryCount = 0;
    let retryDelay = 1000;

    while (retryCount < maxRetries) {
      try {
        const url = `${this.baseUrl}/${sheetId}/values/${encodeURIComponent(range)}?key=${this.config.apiKey}`;
        const response = await fetch(url);
        if (response.ok) {
          const data: SheetData = await response.json();
          return data.values || [];
        }
        if (response.status === 429) {
          retryCount++;
          await new Promise(r => setTimeout(r, retryDelay));
          retryDelay = retryDelay * 2 + Math.random() * 1000;
          continue;
        }
        if (response.status === 403) throw new Error(`Permission denied: ${response.status}`);
        if (response.status === 404) throw new Error(`Sheet not found: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      } catch (error) {
        if (retryCount >= maxRetries - 1) {
          console.error('Error fetching sheet data after retries:', error);
          return [];
        }
        retryCount++;
        await new Promise(r => setTimeout(r, retryDelay));
        retryDelay = retryDelay * 2 + Math.random() * 1000;
      }
    }
    console.error('Max retries reached for fetching sheet data');
    return [];
  }

  // --- Data Fetch/Transform Methods ---
  async getHelperData(): Promise<Helper[]> {
    const now = Date.now();
    if (this.helperDataCache && now - this.lastFetchTime < this.cacheTTL) {
      return this.helperDataCache;
    }
    const data = await this.fetchSheetData(this.config.helperSheetId, 'Helper Masterdata!A:Z');
    if (!Array.isArray(data) || data.length === 0) return [];
    const [headers, ...rows] = data;
    this.helperDataCache = rows.map(row => this.mapRowToHelper(headers, row));
    this.lastFetchTime = now;
    return this.helperDataCache;
  }

  // Compatibility wrapper for legacy code
  async loadHelpers(): Promise<Helper[]> {
    return this.getHelperData();
  }

  async getQuestions(): Promise<any[]> {
    return this.getGenericSheetData(
      this.config.questionsSheetId,
      'Questions!A:Z',
      {
        'ID': 'id',
        'Question': 'question',
        'Category': 'category',
        'Match For': 'matchFor',
        'Compulsory': 'compulsory'
      },
      row => ({
        ...row,
        matchFor: typeof row.matchFor === 'string' ? row.matchFor.split(',').map((s: string) => s.trim()) : [],
        compulsory: row.compulsory?.toLowerCase() === 'yes' || row.compulsory === true
      })
    );
  }

  async getValueContent(): Promise<any[]> {
    return this.getGenericSheetData(
      this.config.contentSheetId,
      'Guided Content!A:Z',
      {
        'Trait': 'trait',
        'Value': 'value',
        'Category': 'category'
      }
    );
  }

  // --- Utilities ---
  private mapRowToHelper(headers: string[], row: string[]): Helper {
    const helper = {} as Helper;
    headers.forEach((header, idx) => {
      const value = row[idx] || '';
      switch (header.toLowerCase().trim()) {
        case 'code': helper.code = value; break;
        case 'name': helper.name = value; break;
        case 'nationality': helper.nationality = value; break;
        case 'age': helper.age = parseInt(value) || 0; break;
        case 'helper exp.':
        case 'experience': helper.experience = parseInt(value) || 0; break;
        case 'language':
        case 'english': helper.english = value; break;
        case 'height (cm)':
        case 'height': helper.height = parseInt(value) || 0; break;
        case 'weight (kg)':
        case 'weight': helper.weight = parseInt(value) || 0; break;
        case 'religion': helper.religion = value; break;
        case 'education': helper.education = value; break;
        case 'marital':
        case 'marital status': helper.marital = value; break;
        case 'children': helper.children = value; break;
        case 'salary': helper.salary = parseInt(value) || 0; break;
        case 'availability': helper.availability = value; break;
        case 'status': helper.status = value; break;
        case 'work experience':
        case 'notes': helper.notes = value; break;
        // Add mapping for jobscope/focus_area/passport/transfer if present in sheet
      }
    });
    helper.jobscope = helper.jobscope || [];
    helper.focus_area = helper.focus_area || [];
    helper.passport_ready = !!helper.passport_ready;
    helper.transfer_ready = !!helper.transfer_ready;
    return helper;
  }

  private async getGenericSheetData(
    sheetId: string,
    range: string,
    fieldMap: { [key: string]: string },
    postProcess?: (row: any) => any
  ): Promise<any[]> {
    const data = await this.fetchSheetData(sheetId, range);
    if (!Array.isArray(data) || data.length === 0) return [];
    const [headers, ...rows] = data;
    return rows.map(row => {
      const mapped: any = {};
      headers.forEach((header, idx) => {
        if (!(header in fieldMap)) return;
        const value = row[idx] || '';
        const fieldName = fieldMap[header] || header.toLowerCase().replace(/\s+/g, '_');
        mapped[fieldName] = value;
      });
      return postProcess ? postProcess(mapped) : mapped;
    });
  }
}

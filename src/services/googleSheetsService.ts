// src/services/googleSheetsService.ts

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

// --- Main Service ---
export class GoogleSheetsService {
  private config: GoogleSheetsConfig = {
    apiKey: import.meta.env.VITE_GOOGLE_SHEETS_API_KEY || '',
    helperSheetId: '1ohjfGkv9NBGTOQ5hmGizWKOPck9xFaZghBepl02Xch0',
    questionsSheetId: '1kDtQAwEkNW6PTjxOchWYuYKNOnGbwTIULrQsw9SnLmc',
    contentSheetId: '1Lj2nZKcVJMeITFX9StMXdNeXkOAtKZLOpb84X1HH0nE',
  };

  private baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  private helperDataCache: any[] | null = null;
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

  // --- Mapping: Always Use Exact Sheet Headers ---
  private mapRowToObject(headers: string[], row: string[]): Record<string, string> {
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx] || "";
    });
    return obj;
  }

  // --- Data Fetch/Transform Methods ---
  async getHelperData(): Promise<any[]> {
    const now = Date.now();
    if (this.helperDataCache && now - this.lastFetchTime < this.cacheTTL) {
      return this.helperDataCache;
    }
    const data = await this.fetchSheetData(this.config.helperSheetId, 'Helper Masterdata!A:AP');
    if (!Array.isArray(data) || data.length === 0) return [];
    const [headers, ...rows] = data;
    this.helperDataCache = rows.map(row => this.mapRowToObject(headers, row));
    this.lastFetchTime = now;
    return this.helperDataCache;
  }

  // Compatibility wrapper for legacy code
  async loadHelpers(): Promise<any[]> {
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

  // --- Generic Sheet Loader for Other Content/Questions ---
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

  // --- New: Get Unique CSO List from Sheet ---
  async getUniqueCSOList(): Promise<string[]> {
    // Sheet: 1T71f2W5ynyszcvJa4PuxX12e9uj7LGEN9an4IYGHXgE, Tab: Opportunity (Combine_CMD)
    const data = await this.fetchSheetData(
      "1T71f2W5ynyszcvJa4PuxX12e9uj7LGEN9an4IYGHXgE",
      "'Opportunity (Combine_CMD)'!A:Z"
    );
    if (!Array.isArray(data) || data.length < 2) return [];
    const [headers, ...rows] = data;

    // Find CSO column (case-insensitive, not CSO ID)
    let csoIdx = headers.findIndex(
      h => h.toLowerCase().includes("cso") && !h.toLowerCase().includes("id")
    );
    if (csoIdx === -1) return [];

    // Split, trim, and flatten all names
    const allCSOs = rows
      .map(row => row[csoIdx] || "")
      .flatMap(val =>
        String(val)
          .split(/,|;|\/|\n/)
          .map(name => name.trim())
          .filter(Boolean)
      );

    // Return unique names (non-empty)
    return Array.from(new Set(allCSOs)).filter(Boolean);
  }

  /**
 * Get all rows from Opportunity (Combine_CMD) sheet where Status is "Active"
 * Each row object includes at least: cso, clientName, contact, status
 */
  async getActiveOpportunities(): Promise<any[]> {
    const data = await this.fetchSheetData(
      "1T71f2W5ynyszcvJa4PuxX12e9uj7LGEN9an4IYGHXgE",
      "'Opportunity (Combine_CMD)'!A:AM"
    );
    if (!Array.isArray(data) || data.length < 2) return [];
    const [headers, ...rows] = data;
    const rowObjs = rows.map(row => this.mapRowToObject(headers, row));
    const actives = rowObjs.filter(row =>
      (row.status || row.Status || "").toLowerCase() === "active"
    );
    return actives; // RETURN THE FULL ROW!
  }

}

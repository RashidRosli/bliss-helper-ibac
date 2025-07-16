// src/services/GoogleAppsScriptService.ts

/**
 * Google Apps Script API Service
 * Fetches customer opportunity data by contact number via GAS endpoint.
 * GAS endpoint URL is configured via VITE_GAS_API_URL in .env.
 */

export class GoogleAppsScriptService {
  private baseUrl: string =
    import.meta.env.VITE_GAS_API_URL ||
    "";

  /**
   * Fetches opportunity/customer row by contact number.
   * @param contact (string): e.g., '91234567' or '+65 9123 4567'
   * @returns Promise<Object | null>
   */
  async getOpportunityByContact(contact: string): Promise<any | null> {
    if (!contact) return null;
    if (!this.baseUrl) {
      console.error("GAS API URL is not configured. Please set VITE_GAS_API_URL in your environment.");
      return null;
    }
    try {
      // Clean up contact string for uniform matching
      const cleanContact = String(contact).replace(/\D/g, "");
      const url = `${this.baseUrl}?contact=${encodeURIComponent(cleanContact)}`;
      const resp = await fetch(url, {
        method: "GET",
      });

      // The GAS API returns 200 for both found and not-found (with error:true)
      if (!resp.ok) {
        console.error("GAS API request failed", resp.status, resp.statusText);
        return null;
      }
      const data = await resp.json();
      if (data && !data.error) {
        return data;
      } else {
        // Not found or other error
        return null;
      }
    } catch (error) {
      console.error("GoogleAppsScriptService getOpportunityByContact error:", error);
      return null;
    }
  }
}

export class GoogleAppsScriptService {
  private baseUrl: string =
    import.meta.env.VITE_GAS_API_URL || "";

  /**
   * Fetches opportunity/customer row by contact number and CSO.
   * @param contact (string): e.g., '91234567'
   * @param cso (string): The CSO name/ID
   * @returns Promise<Object | null>
   */
  async getOpportunityByContact(contact: string, cso: string): Promise<any | null> {
    if (!contact || !cso) return null;
    if (!this.baseUrl) {
      console.error("GAS API URL is not configured. Please set VITE_GAS_API_URL in your environment.");
      return null;
    }
    try {
      // Clean up contact string for uniform matching
      const cleanContact = String(contact).replace(/\D/g, "");
      const url = `${this.baseUrl}?contact=${encodeURIComponent(cleanContact)}&cso=${encodeURIComponent(cso)}`;
      const resp = await fetch(url, {
        method: "GET",
      });

      if (!resp.ok) {
        console.error("GAS API request failed", resp.status, resp.statusText);
        return null;
      }
      const data = await resp.json();
      if (data && !data.error) {
        return data;
      } else {
        return null;
      }
    } catch (error) {
      console.error("GoogleAppsScriptService getOpportunityByContact error:", error);
      return null;
    }
  }
}

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
    if (!contact || !cso) {
      console.error('Missing contact or cso input');
      return null;
    }
    const cleanContact = String(contact).replace(/\D/g, "");
    if (!cleanContact || cleanContact.length < 8) {
      console.error('Invalid contact number: must contain at least 8 digits');
      return null;
    }
    if (!cso.trim()) {
      console.error('CSO cannot be empty or whitespace');
      return null;
    }
    if (!this.baseUrl) {
      console.error("GAS API URL is not configured. Please set VITE_GAS_API_URL in your environment.");
      return null;
    }
    try {
      const url = `${this.baseUrl}?contact=${encodeURIComponent(cleanContact)}&cso=${encodeURIComponent(cso)}`;
      console.log('Request URL:', url); // Log URL for debugging
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
        console.error('GAS API error response:', data);
        return null;
      }
    } catch (error) {
      console.error("GoogleAppsScriptService getOpportunityByContact error:", error);
      return null;
    }
  }
}

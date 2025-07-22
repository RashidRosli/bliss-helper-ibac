import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Phone, Loader2, Send } from "lucide-react";
import { EmployerRequirements } from "../../types";
import { GoogleSheetsService } from "../../services/googleSheetsService";

// In-session cache for CSO list
let cachedCSOList: string[] | null = null;

// In-session cache for active opportunities
let cachedActiveRows: any[] | null = null;

export interface ContactLookupFormProps {
  onContactFound: (data: EmployerRequirements) => void;
  onLookupContact: (contact: string, cso: string) => Promise<any>;
  isLoading?: boolean;
  onBack?: () => void;
  sheetService: GoogleSheetsService;
}

export const ContactLookupForm: React.FC<ContactLookupFormProps> = ({
  onContactFound,
  onLookupContact,
  isLoading = false,
  onBack,
  sheetService,
}) => {
  const [contactNumber, setContactNumber] = useState("");
  const [cso, setCSO] = useState("");
  const [csoList, setCSOList] = useState<string[]>([]);
  const [csoError, setCsoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loadingCSO, setLoadingCSO] = useState(false);

  // For listing active clients
  const [activeRows, setActiveRows] = useState<any[]>([]);
  const [activeError, setActiveError] = useState<string | null>(null);
  const [loadingActive, setLoadingActive] = useState(false);
  const [activeTableHeaders, setActiveTableHeaders] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ---- Improved CSO fetcher with caching, error, retry, and abort ----
  const fetchCSOList = useCallback(async () => {
    setLoadingCSO(true);
    setCsoError(null);

    if (cachedCSOList && cachedCSOList.length > 0) {
      setCSOList(cachedCSOList);
      setLoadingCSO(false);
      if (cachedCSOList.length === 1) setCSO(cachedCSOList[0]);
      return;
    }

    const abortController = new AbortController();

    try {
      const promise = sheetService.getUniqueCSOList();
      const timeout = new Promise<string[]>((_, reject) => {
        abortController.signal.addEventListener("abort", () => reject(new Error("aborted")));
      });
      const names = await Promise.race([promise, timeout]);
      if (!Array.isArray(names)) throw new Error("Bad CSO data");
      setCSOList(names);
      cachedCSOList = names;
      if (names.length === 1) setCSO(names[0]);
    } catch (e: any) {
      if (e.message === "aborted") return;
      setCsoError("Could not load CSO list. Please try again.");
    } finally {
      setLoadingCSO(false);
    }

    return () => {
      abortController.abort();
    };
  }, [sheetService]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    fetchCSOList().then(fn => {
      if (typeof fn === "function") cleanup = fn;
    });
    return () => cleanup && cleanup();
  }, [fetchCSOList]);

  // ---- Fetch active rows ----
  const fetchActiveRows = useCallback(async () => {
    setLoadingActive(true);
    setActiveError(null);

    if (cachedActiveRows && cachedActiveRows.length > 0) {
      setActiveRows(cachedActiveRows);
      // Auto-detect headers
      if (cachedActiveRows.length > 0) {
        setActiveTableHeaders(Object.keys(cachedActiveRows[0]));
      }
      setLoadingActive(false);
      return;
    }

    try {
      // getActiveOpportunities must return *full rows* with ALL original headers!
      const rows = await sheetService.getActiveOpportunities();
      setActiveRows(rows);
      cachedActiveRows = rows;
      // Auto-detect headers for display
      if (rows.length > 0) {
        setActiveTableHeaders(Object.keys(rows[0]));
      }
    } catch (e) {
      setActiveError("Failed to load active clients. Try again.");
    } finally {
      setLoadingActive(false);
    }
  }, [sheetService]);

  useEffect(() => {
    fetchActiveRows();
  }, [fetchActiveRows]);

  // Small success effect
  useEffect(() => {
    if (success) {
      const timeout = setTimeout(() => setSuccess(false), 600);
      return () => clearTimeout(timeout);
    }
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!contactNumber.trim()) {
      setError("Please enter a customer phone number.");
      return;
    }
    if (!cso) {
      setError("Please select a CSO.");
      return;
    }

    try {
      inputRef.current?.blur();
      const data = await onLookupContact(contactNumber.trim(), cso);
      if (data && !data.error) {
        onContactFound(data);
        setSuccess(true);
        setError(null);
      } else if (data && data.error) {
        setError(data.message || "Customer not found. Try a different phone number.");
      } else {
        setError("Customer not found. Please check or fill form manually.");
      }
    } catch {
      setError("Error looking up contact. Please try again.");
    }
  };

  // ---- Send row details to EmployerRequirementsForm ----
  const handleSendRow = (row: any) => {
    console.log("Send row (full):", row); // Confirm all fields are present
    onContactFound(row);
  };

  // For better table, show common columns first, but display all
  const preferCols = [
    "CSO", "cso",
    "Name of client", "clientName", "customerName",
    "Contact", "contact",
    "Jobscope", "jobscope",
    "Preference remarks", "preferenceremarks",
    "Status", "status"
  ];

  const sortedHeaders = [
    ...preferCols.filter(col => activeTableHeaders.includes(col)),
    ...activeTableHeaders.filter(col => !preferCols.includes(col))
  ];

  return (
    <div className="relative bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      {onBack && (
        <button
          onClick={onBack}
          className="mb-4 text-sm text-blue-500 hover:underline"
          type="button"
        >
          &larr; Back
        </button>
      )}

      <div className="flex items-center space-x-2 mb-4">
        <Phone className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Quick Customer Lookup</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Enter the customer's phone number and select the CSO.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* CSO Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CSO <span className="text-red-500">*</span>
          </label>
          <div className="flex space-x-2 items-center">
            <select
              value={cso}
              onChange={e => setCSO(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500"
              disabled={loadingCSO || isLoading || !!csoError}
              required
            >
              <option value="">-- Select CSO --</option>
              {csoList.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            {loadingCSO && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
            {csoError && (
              <button
                type="button"
                onClick={fetchCSOList}
                className="ml-2 text-blue-600 underline text-xs"
              >
                Retry
              </button>
            )}
          </div>
          {csoError && <div className="text-xs text-red-600 mt-1">{csoError}</div>}
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="flex space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              aria-label="Customer phone number"
              aria-busy={isLoading}
              placeholder="e.g., 91234567"
              className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${success
                ? "border-green-400 ring-green-300"
                : "border-gray-300 focus:ring-blue-500"
                }`}
              required
              disabled={isLoading}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={isLoading || !contactNumber.trim() || !cso}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span>{isLoading ? "Looking up..." : "Lookup"}</span>
            </button>
          </div>
        </div>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </form>

      {/* ---- List of active clients at the bottom ---- */}
      <div className="mt-8">
        <h4 className="text-md font-semibold mb-2 flex items-center">
          Active Clients <span className="ml-2">{loadingActive && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}</span>
        </h4>
        {activeError && (
          <div className="text-xs text-red-600 mb-2">{activeError}</div>
        )}
        <div className="max-h-60 overflow-x-auto rounded-md border">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1 text-left">CSO</th>
                <th className="px-2 py-1 text-left">Client Name</th>
                <th className="px-2 py-1 text-left">Contact</th>
                <th className="px-2 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {loadingActive ? (
                <tr>
                  <td colSpan={4} className="px-2 py-2 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : activeRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-2 text-center text-gray-400">
                    No active clients found.
                  </td>
                </tr>
              ) : (
                activeRows.map((row, idx) => {
                  // Flexible keys for display
                  const cso = row["CSO"] || row["cso"] || "";
                  const clientName = row["Name of client"] || row["clientName"] || row["customerName"] || "";
                  const contact = row["Contact"] || row["contact"] || row["Phone"] || row["phone"] || row["hp"] || "";
                  return (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-2 py-1 whitespace-nowrap">{cso}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{clientName}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{contact}</td>
                      <td className="px-2 py-1">
                        <button
                          title="Send to Employer Form"
                          className="text-blue-600 hover:text-blue-900 rounded-full p-1"
                          onClick={() => handleSendRow(row)}
                          type="button"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> CSO names and client info are pulled from the Opportunity (Combine_CMD) Google Sheet.
        </p>
      </div>
    </div>
  );
};

export default ContactLookupForm;

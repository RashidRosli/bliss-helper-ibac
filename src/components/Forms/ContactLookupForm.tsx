import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, Phone, Loader2, Send, AlertCircle, ChevronDown, ChevronUp, CheckCircle, FileDown } from "lucide-react";
import { EmployerRequirements } from "../../types";
import { GoogleSheetsService } from "../../services/googleSheetsService";
import { debounce } from "lodash";

// In-session cache for CSO list
let cachedCSOList: string[] | null = null;

// In-session cache for active opportunities
let cachedActiveRows: any[] | null = null;

export interface ContactLookupFormProps {
  onContactFound: (data: EmployerRequirements) => Promise<void>;
  onLookupContact: (contact: string, cso: string) => Promise<any>;
  isLoading?: boolean;
  onBack?: () => void;
  onStartForm: () => void;
  sheetService: GoogleSheetsService;
}

export const ContactLookupForm: React.FC<ContactLookupFormProps> = ({
  onContactFound,
  onLookupContact,
  isLoading = false,
  onBack,
  onStartForm,
  sheetService,
}) => {
  const [contactNumber, setContactNumber] = useState("");
  const [cso, setCSO] = useState("");
  const [csoList, setCSOList] = useState<string[]>([]);
  const [csoError, setCsoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loadingCSO, setLoadingCSO] = useState(false);
  const [activeRows, setActiveRows] = useState<any[]>([]);
  const [activeError, setActiveError] = useState<string | null>(null);
  const [loadingActive, setLoadingActive] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending" | null;
  }>({ key: "", direction: null });
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [sendingRow, setSendingRow] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);

  // Define fixed display headers
  const displayHeaders = ["CSO", "Name of client", "Contact"];

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

  // ---- Fetch active rows ----
  const fetchActiveRows = useCallback(async () => {
    setLoadingActive(true);
    setActiveError(null);

    if (cachedActiveRows && cachedActiveRows.length > 0) {
      setActiveRows(cachedActiveRows);
      setLoadingActive(false);
      return;
    }

    try {
      const rows = await sheetService.getActiveOpportunities();
      setActiveRows(rows);
      cachedActiveRows = rows;
    } catch (e) {
      setActiveError("Failed to load active clients. Try again.");
    } finally {
      setLoadingActive(false);
    }
  }, [sheetService]);

  // ---- Initial data fetch ----
  useEffect(() => {
    const fetchData = async () => {
      setIsInitialLoading(true);
      await Promise.all([fetchCSOList(), fetchActiveRows()]);
      setIsInitialLoading(false);
    };

    let cleanup: (() => void) | undefined;
    fetchData().then(fn => {
      if (typeof fn === "function") cleanup = fn;
    });
    return () => cleanup && cleanup();
  }, [fetchCSOList, fetchActiveRows]);

  // ---- Success effect ----
  useEffect(() => {
    if (success) {
      const timeout = setTimeout(() => setSuccess(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [success]);

  // ---- Toast effect ----
  useEffect(() => {
    if (toast) {
      const timeout = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [toast]);

  // ---- Submit handler with phone number validation ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!contactNumber.trim()) {
      setError("Please enter a customer phone number.");
      return;
    }
    // Basic Singapore phone number validation (8 digits, starts with 8 or 9)
    if (!/^[89]\d{7}$/.test(contactNumber.trim())) {
      setError("Please enter a valid Singapore phone number (e.g., 91234567).");
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
        await onContactFound(data);
        setSuccess(true);
        setError(null);
        setContactNumber("");
        setToast({ message: "Customer details sent successfully!", type: "success" });
      } else if (data && data.error) {
        setError(data.message || "Customer not found. Try a different phone number.");
      } else {
        setError("Customer not found. Please check or fill form manually.");
      }
    } catch {
      setError("Error looking up contact. Please try again.");
      setToast({ message: "Failed to send customer details.", type: "error" });
    }
  };

  // ---- Send row details to EmployerRequirementsForm ----
  const handleSendRow = async (row: any, index: number) => {
    setSendingRow(index);
    try {
      await onContactFound(row);
      setToast({ message: "Client details sent successfully!", type: "success" });
    } catch {
      setToast({ message: "Failed to send client details.", type: "error" });
    } finally {
      setSendingRow(null);
    }
  };

  // ---- Debounced filter handler ----
  const debouncedSetFilterQuery = useMemo(
    () => debounce((value: string) => setFilterQuery(value), 300),
    []
  );

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSetFilterQuery.cancel();
    };
  }, [debouncedSetFilterQuery]);

  // ---- Filter active rows ----
  const filteredRows = useMemo(() => {
    if (!filterQuery.trim()) return activeRows;
    const query = filterQuery.toLowerCase();
    return activeRows.filter(row => {
      return displayHeaders.some(header => {
        const value = (row[header] || row[header.toLowerCase()] || "").toString().toLowerCase();
        return value.includes(query);
      });
    });
  }, [activeRows, filterQuery]);

  // ---- Sort table by column ----
  const handleSort = (key: string) => {
    let direction: "ascending" | "descending" | null = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    } else if (sortConfig.key === key && sortConfig.direction === "descending") {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  // ---- Sorted rows ----
  const sortedRows = useMemo(() => {
    if (!sortConfig.direction) return filteredRows;
    const sorted = [...filteredRows];
    sorted.sort((a, b) => {
      const aValue = (a[sortConfig.key] || a[sortConfig.key.toLowerCase()] || "").toString().toLowerCase();
      const bValue = (b[sortConfig.key] || b[sortConfig.key.toLowerCase()] || "").toString().toLowerCase();
      if (sortConfig.direction === "ascending") {
        return aValue.localeCompare(bValue);
      }
      return bValue.localeCompare(aValue);
    });
    return sorted;
  }, [filteredRows, sortConfig]);

  // ---- Toggle row selection ----
  const toggleRowSelection = (index: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // ---- Toggle row expansion (mobile) ----
  const toggleRowExpansion = (index: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // ---- Clear filter ----
  const clearFilter = () => {
    setFilterQuery("");
    filterInputRef.current?.focus();
  };

  // ---- Export table as CSV ----
  const exportToCSV = () => {
    const csvRows = [
      displayHeaders.join(","),
      ...sortedRows.map(row => {
        return displayHeaders
          .map(header => (row[header] || row[header.toLowerCase()] || "").toString().replace(/,/g, ""))
          .join(",");
      }),
    ];
    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "active_clients.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Initial Loading UI ----
  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" aria-hidden="true" />
          <p className="text-lg font-medium text-gray-700">Loading customer data...</p>
        </div>
      </div>
    );
  }

  // ---- Error Fallback UI ----
  if (csoError && activeError) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 max-w-md text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" aria-hidden="true" />
          <p className="text-lg font-medium text-gray-900">Failed to load data</p>
          <p className="text-sm text-gray-600">
            Unable to load CSO list and active clients. Please try again.
          </p>
          <button
            onClick={() => {
              fetchCSOList();
              fetchActiveRows();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 hover:scale-105 transform"
            aria-label="Retry loading data"
          >
            <Loader2 className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200 max-w-5xl mx-auto transition-all duration-500 animate-fade-in">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            toast.type === "success" ? "bg-green-100 border-green-200 text-green-800" : "bg-red-100 border-red-200 text-red-800"
          } animate-fade-in`}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" ? (
              <CheckCircle className="h-5 w-5" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="mb-6 text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-2 transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded hover:scale-105 transform"
          type="button"
          aria-label="Go back"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Phone className="h-8 w-8 text-blue-600" aria-hidden="true" />
        <h3 className="text-2xl font-bold text-gray-900">Customer Lookup</h3>
      </div>

      <p className="text-base text-gray-600 mb-10 leading-relaxed">
        Search for existing customers by phone number and CSO, or fill out the employer requirements form for custom matching.
      </p>

      {/* Sticky Form */}
      <div className="sticky top-4 z-20 bg-white sm:bg-transparent sm:shadow-none shadow-md rounded-lg sm:rounded-none">
        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-100 p-6 rounded-lg sm:shadow-sm">
          {/* CSO Dropdown */}
          <div>
            <label htmlFor="cso" className="block text-sm font-medium text-gray-700 mb-2">
              CSO <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <select
                id="cso"
                value={cso}
                onChange={e => setCSO(e.target.value)}
                className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed text-base"
                disabled={loadingCSO || isLoading || !!csoError}
                required
                aria-describedby={csoError ? "cso-error" : undefined}
              >
                <option value="">Select CSO</option>
                {csoList.map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              {loadingCSO && <Loader2 className="h-5 w-5 animate-spin text-blue-600" aria-hidden="true" />}
              {csoError && (
                <button
                  type="button"
                  onClick={fetchCSOList}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded hover:scale-105 transform"
                  aria-label="Retry loading CSO list"
                >
                  Retry
                </button>
              )}
            </div>
            {csoError && (
              <p id="cso-error" className="mt-2 text-sm text-red-600 flex items-center gap-2" role="alert">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                {csoError}
              </p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="contact-number" className="block text-sm font-medium text-gray-700 mb-2">
              Customer Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              <input
                id="contact-number"
                ref={inputRef}
                type="text"
                value={contactNumber}
                onChange={e => setContactNumber(e.target.value)}
                aria-label="Customer phone number"
                aria-busy={isLoading}
                placeholder="e.g., 91234567"
                className={`flex-1 px-4 py-3 bg-white border rounded-lg focus:ring-2 focus:border-blue-500 outline-none transition-all duration-300 text-base ${
                  success
                    ? "border-green-400 ring-green-300"
                    : error
                    ? "border-red-400 ring-red-300"
                    : "border-gray-300 focus:ring-blue-500"
                } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                required
                disabled={isLoading}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={isLoading || !contactNumber.trim() || !cso}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:scale-105 transform"
                aria-label={isLoading ? "Looking up customer" : "Lookup customer"}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : success ? (
                  <CheckCircle className="h-5 w-5 animate-pulse text-green-200" aria-hidden="true" />
                ) : (
                  <Search className="h-5 w-5" aria-hidden="true" />
                )}
                <span>{isLoading ? "Looking up..." : success ? "Success!" : "Lookup"}</span>
              </button>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-2" role="alert">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                {error}
              </p>
            )}
            {success && (
              <p className="mt-2 text-sm text-green-600 flex items-center gap-2" role="alert" aria-live="polite">
                <CheckCircle className="h-4 w-4 animate-pulse" aria-hidden="true" />
                Customer found successfully!
              </p>
            )}
          </div>
        </form>

        {/* Employer Requirements Form Button */}
        <button
          onClick={onStartForm}
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-md hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 hover:scale-105 transform w-full sm:w-auto"
          type="button"
          aria-label="Go to Employer Requirements Form"
        >
          <FileDown className="h-5 w-5" aria-hidden="true" />
          Employer Requirements Form
        </button>
      </div>

      {/* Active Clients Table */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            Active Clients
            {loadingActive && <Loader2 className="h-5 w-5 animate-spin text-blue-600" aria-hidden="true" />}
          </h4>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                ref={filterInputRef}
                type="text"
                value={filterQuery}
                onChange={e => debouncedSetFilterQuery(e.target.value)}
                placeholder="Filter clients..."
                className="pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base w-44 sm:w-56 transition-all duration-200"
                aria-label="Filter active clients"
              />
              <Search
                className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                aria-hidden="true"
                aria-label="Search icon"
              />
            </div>
            <button
              onClick={clearFilter}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded hover:scale-105 transform"
              aria-label="Clear filter"
            >
              Clear
            </button>
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 hover:scale-105 transform"
              aria-label="Export table to CSV"
              title="Export to CSV"
            >
              <FileDown className="h-5 w-5" aria-hidden="true" />
              Export
            </button>
          </div>
        </div>
        {activeError && (
          <div className="mb-4 p-4 bg-red-100 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700" role="alert">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
            {activeError}
            <button
              onClick={fetchActiveRows}
              className="ml-2 text-blue-600 hover:text-blue-800 font-medium underline focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded hover:scale-105 transform"
              aria-label="Retry loading active clients"
            >
              Retry
            </button>
          </div>
        )}
        <div className="hidden sm:block max-h-96 overflow-y-auto rounded-lg border border-gray-200 shadow-md" role="grid" aria-label="Active clients table">
          <table className="min-w-full text-base divide-y divide-gray-200">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-800 w-16">
                  <input
                    type="checkbox"
                    onChange={() => {
                      if (selectedRows.size === sortedRows.length) {
                        setSelectedRows(new Set());
                      } else {
                        setSelectedRows(new Set(sortedRows.map((_, idx) => idx)));
                      }
                    }}
                    checked={sortedRows.length > 0 && selectedRows.size === sortedRows.length}
                    aria-label="Select all rows"
                    className="rounded h-5 w-5 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                {displayHeaders.map(header => (
                  <th
                    key={header}
                    className="px-6 py-4 text-left font-semibold text-gray-800 cursor-pointer hover:bg-gray-200 transition-colors duration-150"
                    onClick={() => handleSort(header)}
                    role="columnheader"
                    aria-sort={sortConfig.key === header ? sortConfig.direction ?? "none" : "none"}
                  >
                    <div className="flex items-center gap-2">
                      {header}
                      {sortConfig.key === header && sortConfig.direction === "ascending" && (
                        <ChevronUp className="h-5 w-5 text-gray-500" aria-hidden="true" />
                      )}
                      {sortConfig.key === header && sortConfig.direction === "descending" && (
                        <ChevronDown className="h-5 w-5 text-gray-500" aria-hidden="true" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-6 py-4 text-left font-semibold text-gray-800 sticky right-0 bg-gray-100 w-24" aria-hidden="true">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loadingActive ? (
                // Skeleton Loading
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-5 bg-gray-200 rounded w-6"></div>
                    </td>
                    {displayHeaders.map((_, headerIdx) => (
                      <td key={headerIdx} className="px-6 py-4">
                        <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                      </td>
                    ))}
                    <td className="px-6 py-4">
                      <div className="h-5 bg-gray-200 rounded w-6"></div>
                    </td>
                  </tr>
                ))
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={displayHeaders.length + 2} className="px-6 py-6 text-center text-gray-600">
                    No active clients found. Try adjusting the filter or{" "}
                    <button
                      onClick={fetchActiveRows}
                      className="text-blue-600 hover:text-blue-800 font-medium underline focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded hover:scale-105 transform"
                      aria-label="Retry loading active clients"
                    >
                      retry
                    </button>.
                  </td>
                </tr>
              ) : (
                sortedRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`${
                      selectedRows.has(idx) ? "bg-blue-50" : idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } hover:bg-blue-100 transition-colors duration-150`}
                    role="row"
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(idx)}
                        onChange={() => toggleRowSelection(idx)}
                        aria-label={`Select row ${idx + 1}`}
                        className="rounded h-5 w-5 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    {displayHeaders.map(header => (
                      <td
                        key={header}
                        className="px-6 py-4 whitespace-nowrap min-w-[140px] text-gray-800 truncate max-w-[200px]"
                        title={(row[header] || row[header.toLowerCase()] || "").toString()}
                      >
                        {(row[header] || row[header.toLowerCase()] || "").toString()}
                      </td>
                    ))}
                    <td className="px-6 py-4 sticky right-0 bg-inherit">
                      <button
                        title="Send to Employer Form"
                        className="relative text-blue-600 hover:text-blue-800 rounded-full p-2 transition-colors duration-200 group focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:scale-110 transform"
                        onClick={() => handleSendRow(row, idx)}
                        type="button"
                        aria-label={`Send row ${idx + 1} details to employer form`}
                        disabled={sendingRow === idx}
                      >
                        {sendingRow === idx ? (
                          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Send className="h-5 w-5" aria-hidden="true" />
                        )}
                        <span className="absolute hidden group-hover:block -top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-md shadow-md">
                          Send to Form
                        </span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Mobile Card Layout */}
        <div className="sm:hidden space-y-4">
          {loadingActive ? (
            Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="p-5 bg-gray-50 rounded-lg shadow-sm animate-pulse">
                {displayHeaders.map((_, headerIdx) => (
                  <div key={headerIdx} className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                ))}
              </div>
            ))
          ) : sortedRows.length === 0 ? (
            <div className="p-5 bg-white rounded-lg shadow-sm text-center text-gray-600">
              No active clients found. Try adjusting the filter or{" "}
              <button
                onClick={fetchActiveRows}
                className="text-blue-600 hover:text-blue-800 font-medium underline focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded hover:scale-105 transform"
                aria-label="Retry loading active clients"
              >
                retry
              </button>.
            </div>
          ) : (
            sortedRows.map((row, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-lg border shadow-sm ${
                  selectedRows.has(idx) ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
                } transition-colors duration-150`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(idx)}
                      onChange={() => toggleRowSelection(idx)}
                      aria-label={`Select row ${idx + 1}`}
                      className="rounded h-6 w-6 text-blue-600 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => toggleRowExpansion(idx)}
                      className="font-semibold text-gray-900 text-base truncate max-w-[200px]"
                      title={(row["Name of client"] || row["name of client"] || row["clientName"] || row["customerName"] || "Row " + (idx + 1)).toString()}
                      aria-label={`Toggle details for row ${idx + 1}`}
                    >
                      {(row["Name of client"] || row["name of client"] || row["clientName"] || row["customerName"] || "Row " + (idx + 1)).toString()}
                    </button>
                  </div>
                  <button
                    title="Send to Employer Form"
                    className="text-blue-600 hover:text-blue-800 p-2 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded hover:scale-110 transform"
                    onClick={() => handleSendRow(row, idx)}
                    type="button"
                    aria-label={`Send row ${idx + 1} details to employer form`}
                    disabled={sendingRow === idx}
                  >
                    {sendingRow === idx ? (
                      <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                    ) : (
                      <Send className="h-6 w-6" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {expandedRows.has(idx) && (
                  <div className="text-sm text-gray-600 space-y-2 animate-fade-in">
                    {displayHeaders.map(header => (
                      <p key={header}>
                        <strong className="font-medium">{header}:</strong>{" "}
                        {(row[header] || row[header.toLowerCase()] || "").toString()}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-10 p-5 bg-blue-50 border border-blue-100 rounded-lg shadow-sm">
        <p className="text-sm text-blue-700 leading-relaxed">
          <strong>Note:</strong> CSO names and client information are sourced from the Opportunity (Combine_CMD) Google Sheet.
        </p>
      </div>
    </div>
  );
};

export default ContactLookupForm;
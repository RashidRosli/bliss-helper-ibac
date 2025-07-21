import React, { useState, useEffect, useRef } from "react";
import { Search, Phone, Loader2 } from "lucide-react";
import { EmployerRequirements } from "../../types";
import { GoogleSheetsService } from "../../services/googleSheetsService";

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loadingCSO, setLoadingCSO] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load CSO list from Google Sheets on mount
  useEffect(() => {
    let mounted = true;
    setLoadingCSO(true);
    sheetService.getUniqueCSOList().then((names) => {
      if (mounted) {
        setCSOList(names);
        setLoadingCSO(false);
        if (names.length === 1) setCSO(names[0]);
      }
    }).catch(() => setLoadingCSO(false));
    return () => { mounted = false; };
  }, [sheetService]);

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
          <div className="flex space-x-2">
            <select
              value={cso}
              onChange={e => setCSO(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500"
              disabled={loadingCSO || isLoading}
              required
            >
              <option value="">-- Select CSO --</option>
              {csoList.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            {loadingCSO && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
          </div>
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

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> CSO names are pulled from the Opportunity (Combine_CMD) Google Sheet.
        </p>
      </div>
    </div>
  );
};

export default ContactLookupForm;

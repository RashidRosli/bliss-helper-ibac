import React, { useState, useEffect, useRef } from "react";
import { Search, Phone, Loader2 } from "lucide-react";

interface ContactLookupFormProps {
  onContactFound: (data: any) => void;
  onLookupContact: (contact: string) => Promise<any>;
  isLoading?: boolean;
}

export const ContactLookupForm: React.FC<ContactLookupFormProps> = ({
  onContactFound,
  onLookupContact,
  isLoading = false,
}) => {
  const [contactNumber, setContactNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!contactNumber.trim()) {
      setError("Please enter a contact number.");
      return;
    }

    try {
      const data = await onLookupContact(contactNumber.trim());
      if (data && !data.error) {
        onContactFound(data);
        setError(null);
      } else if (data && data.error) {
        setError(data.message || "Customer not found. Try a different number.");
      } else {
        setError("Customer not found. Please check number or fill form manually.");
      }
    } catch (err) {
      setError("Error looking up contact. Please try again.");
    }
  };

  return (
    <div className="relative bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center space-x-2 mb-4">
        <Phone className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Quick Customer Lookup</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Enter the customer's contact number to auto-fill their requirements.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Contact Number *
          </label>
          <div className="flex space-x-2">
            <input
              ref={inputRef}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="e.g., 91234567"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !contactNumber.trim()}
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
          <strong>Note:</strong> This will search Google Sheets for matching contact numbers and auto-fill all customer requirements.
        </p>
      </div>
    </div>
  );
};

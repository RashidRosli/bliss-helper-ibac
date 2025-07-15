import React, { useState, useEffect } from 'react';
import { Search, Phone, Loader2 } from 'lucide-react';

interface ContactLookupFormProps {
  onContactFound: (data: any) => void;
  onLookupContact: (contact: string) => Promise<any>;
}

export const ContactLookupForm: React.FC<ContactLookupFormProps> = ({
  onContactFound,
  onLookupContact
}) => {
  const [contactNumber, setContactNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Progress bar animates with actual lookup timing
  useEffect(() => {
    let timer: number;
    if (isLoading) {
      setProgress(0);
      timer = setInterval(() => {
        setProgress(prev => (prev < 80 ? prev + 2 : prev));
      }, 40);
    } else if (!isLoading && progress !== 0) {
      setProgress(100);
      setTimeout(() => setProgress(0), 350); // Slight delay for smooth finish
    }
    return () => clearInterval(timer);
    // eslint-disable-next-line
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactNumber.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await onLookupContact(contactNumber.trim());
      if (data && data.error) {
        setError(data.message);
      } else if (data) {
        onContactFound(data);
      } else {
        setError('No customer found with this contact number. Please check the number or fill the form manually.');
      }
    } catch (err) {
      setError('Error looking up contact. Please try again or fill the form manually.');
      console.error('Contact lookup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      {/* Indeterminate Progress Bar */}
      {progress > 0 && (
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-200 rounded-t overflow-hidden z-10">
          <div
            className="h-1 bg-blue-500 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex items-center space-x-2 mb-4">
        <Phone className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Quick Customer Lookup</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Enter the customer's contact number to automatically fill their requirements from Google Sheets.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Contact Number *
          </label>
          <div className="flex space-x-2">
            <input
              type="tel"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="e.g., +65 9123 4567 or 91234567"
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
              <span>{isLoading ? 'Looking up...' : 'Lookup'}</span>
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
          <strong>Note:</strong> This will search the "Opportunity (Combine_CMD)" tab in your Google Sheets for matching contact numbers and auto-fill all customer requirements.
        </p>
      </div>
    </div>
  );
};

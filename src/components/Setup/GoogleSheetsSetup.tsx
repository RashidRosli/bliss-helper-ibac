import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, ExternalLink, Key } from 'lucide-react';

interface GoogleSheetsSetupProps {
  onApiKeySet: (apiKey: string) => void;
}

export const GoogleSheetsSetup: React.FC<GoogleSheetsSetupProps> = ({ onApiKeySet }) => {
  const [apiKey, setApiKey] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [envKeyChecked, setEnvKeyChecked] = useState(false);

  const testApiKey = async (key: string) => {
    setIsLoading(true);
    try {
      const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/1ohjfGkv9NBGTOQ5hmGizWKOPck9xFaZghBepl02Xch0/values/Helper%20Masterdata!A1:A1?key=${key}`;
      const response = await fetch(testUrl);
      
      if (response.ok) {
        setIsValid(true);
        onApiKeySet(key);
        localStorage.setItem('google_sheets_api_key', key);
      } else {
        setIsValid(false);
      }
    } catch (error) {
      setIsValid(false);
    }
    setIsLoading(false);
  };

  // Check environment variable on component mount
  useEffect(() => {
    const envApiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
    if (envApiKey && !envKeyChecked) {
      setApiKey(envApiKey);
      setEnvKeyChecked(true);
      testApiKey(envApiKey);
    }
  }, [envKeyChecked]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      testApiKey(apiKey.trim());
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Key className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Google Sheets API Setup</h2>
      </div>

      {import.meta.env.VITE_GOOGLE_SHEETS_API_KEY && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-green-800">Environment Variable Detected</h3>
          </div>
          <p className="text-sm text-green-700 mt-1">
            API key found in environment variables. Automatically verifying connection...
          </p>
        </div>
      )}

      <div className="mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-blue-800 mb-2">Required Google Sheets:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Helper Masterdata: <code>1ohjfGkv9NBGTOQ5hmGizWKOPck9xFaZghBepl02Xch0</code></li>
            <li>• Interview Questions: <code>1kDtQAwEkNW6PTjxOchWYuYKNOnGbwTIULrQsw9SnLmc</code></li>
            <li>• Value Content: <code>1Lj2nZKcVJMeITFX9StMXdNeXkOAtKZLOpb84X1HH0nE</code></li>
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">Setup Instructions:</h3>
          <ol className="text-sm text-yellow-700 space-y-1">
            <li>1. Go to <a href="https://console.developers.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center">Google Cloud Console <ExternalLink className="h-3 w-3 ml-1" /></a></li>
            <li>2. Create a new project or select existing one</li>
            <li>3. Enable the Google Sheets API</li>
            <li>4. Create credentials (API Key)</li>
            <li>5. Restrict the API key to Google Sheets API only</li>
            <li>6. Add to .env file as VITE_GOOGLE_SHEETS_API_KEY or enter below</li>
          </ol>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Google Sheets API Key *
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setIsValid(null);
            }}
            placeholder={import.meta.env.VITE_GOOGLE_SHEETS_API_KEY ? "Using environment variable" : "Enter your Google Sheets API key"}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={!import.meta.env.VITE_GOOGLE_SHEETS_API_KEY}
          />
        </div>

        {isValid === false && (
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Invalid API key or insufficient permissions</span>
          </div>
        )}

        {isValid === true && (
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">API key validated successfully!</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || (!apiKey.trim() && !import.meta.env.VITE_GOOGLE_SHEETS_API_KEY)}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
        >
          {isLoading ? 'Validating...' : 'Validate & Connect'}
        </button>
      </form>

      <div className="mt-4 text-xs text-gray-500">
        <p>Your API key is stored locally and used only to access your Google Sheets data.</p>
        {import.meta.env.VITE_GOOGLE_SHEETS_API_KEY && (
          <p className="mt-1 text-green-600">✓ Environment variable configured</p>
        )}
      </div>
    </div>
  );
};
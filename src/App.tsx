import React, { useState, useEffect } from "react";
import { Header } from "./components/Layout/Header";
import { Navigation } from "./components/Layout/Navigation";
import { GoogleSheetsSetup } from "./components/Setup/GoogleSheetsSetup";
import { Dashboard } from "./components/Dashboard/Dashboard";
import { EmployerPage } from "./components/Forms/EmployerPage";
import { InterviewQuestions } from "./components/Results/InterviewQuestions";
import { WhatsAppPitch } from "./components/Results/WhatsAppPitch";
import { GoogleSheetsConnection } from "./components/Setup/GoogleSheetsConnection";
import { EmployerRequirements } from "./types";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'matching' | 'questions' | 'pitch' | 'sheets'>('matching');
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeySet, setIsApiKeySet] = useState(false);

  // This holds the data after EmployerPage finishes!
  const [currentRequirements, setCurrentRequirements] = useState<EmployerRequirements | null>(null);

  // Load stored API key on first mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem('google_sheets_api_key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
      setIsApiKeySet(true);
      (window as any).VITE_GOOGLE_SHEETS_API_KEY = storedApiKey;
    }
  }, []);

  // After user sets API key
  const handleApiKeySet = (key: string) => {
    setApiKey(key);
    setIsApiKeySet(true);
    localStorage.setItem('google_sheets_api_key', key);
    (window as any).VITE_GOOGLE_SHEETS_API_KEY = key;
  };

  // This gets called when EmployerPage form is finalized
  const handleRequirementsFinalized = (requirements: EmployerRequirements) => {
    setCurrentRequirements(requirements);
    // Optionally auto-jump to next tab:
    setActiveTab('questions');
  };

  // Content for each tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard
          totalHelpers={0}
          availableHelpers={0}
          totalMatches={0}
          avgMatchScore={0}
        />;
      case 'matching':
        return (
          <EmployerPage
            onRequirementsFinalized={handleRequirementsFinalized}
          />
        );
      case 'questions':
        return (
          <InterviewQuestions
            requirements={currentRequirements}
          />
        );
      case 'pitch':
        return (
          <WhatsAppPitch
            requirements={currentRequirements}
          />
        );
      case 'sheets':
        return <GoogleSheetsConnection apiKey={apiKey} />;
      default:
        return null;
    }
  };

  // Show Google Sheets setup if API key is not configured
  if (!isApiKeySet) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <GoogleSheetsSetup onApiKeySet={handleApiKeySet} />
        </main>
      </div>
    );
  }

  // Main app layout
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header apiKey={apiKey} />
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as any)}
      />
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} Bliss Helper. All rights reserved.
            </p>
            <p className="text-sm text-gray-600">
              We are in a professional environment and maintain professional standards in all communications.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

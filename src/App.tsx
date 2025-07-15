import { useState, useEffect } from 'react';
import { Header } from './components/Layout/Header';
import { Navigation } from './components/Layout/Navigation';
import { GoogleSheetsSetup } from './components/Setup/GoogleSheetsSetup';
import { EmployerRequirementsForm } from './components/Forms/EmployerRequirementsForm';
import { MatchingResults } from './components/Results/MatchingResults';
import { InterviewQuestions } from './components/Results/InterviewQuestions';
import { WhatsAppPitch } from './components/Results/WhatsAppPitch';
import { Dashboard } from './components/Dashboard/Dashboard';
import { ContactLookupForm } from './components/Forms/ContactLookupForm';
import { MatchingService } from './services/matchingService';
import { QuestionService } from './services/questionService';
import { PitchService } from './services/pitchService';
import { EmployerRequirements, MatchResult } from './types';
import { GoogleSheetsConnection } from './components/Setup/GoogleSheetsConnection';
import { GoogleSheetsService } from './services/googleSheetsService';

function App() {
  const [activeTab, setActiveTab] = useState('matching');
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [matchingResults, setMatchingResults] = useState<MatchResult[]>([]);
  const [currentRequirements, setCurrentRequirements] = useState<EmployerRequirements | null>(null);
  const [interviewQuestions, setInterviewQuestions] = useState<Array<{question: string, reason: string}>>([]);
  const [whatsappPitches, setWhatsappPitches] = useState<Array<{name: string, pitch: string}>>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const matchingService = new MatchingService();
  const questionService = new QuestionService();
  const pitchService = new PitchService();
  const googleSheetsService = new GoogleSheetsService();

  useEffect(() => {
    // Check if API key is already stored
    const storedApiKey = localStorage.getItem('google_sheets_api_key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
      setIsApiKeySet(true);
      // Set environment variable for services
      (window as any).VITE_GOOGLE_SHEETS_API_KEY = storedApiKey;
    }
  }, []);

  const handleApiKeySet = (key: string) => {
    setApiKey(key);
    setIsApiKeySet(true);
    // Set environment variable for services
    (window as any).VITE_GOOGLE_SHEETS_API_KEY = key;
  };

  const handleContactFound = (requirements: EmployerRequirements) => {
    setCurrentRequirements(requirements);
    handleRequirementsSubmit(requirements);
  };

  const handleContactLookup = async (contactNumber: string) => {
    try {
      const opportunity = await googleSheetsService.getOpportunityByContact(contactNumber);
      return opportunity;
    } catch (error) {
      console.error('Error looking up contact:', error);
      return null;
    }
  };

  const handleRequirementsSubmit = async (requirements: EmployerRequirements) => {
    setIsLoading(true);
    console.log('Processing requirements:', requirements);
    
    try {
      setCurrentRequirements(requirements);
      setHasSearched(true);
      
      // Find matching helpers from Google Sheets
      const results = await matchingService.findMatches(requirements);
      console.log('Matching results:', results);
      setMatchingResults(results);
      
      // Generate interview questions for the top match
      if (results.length > 0) {
        const questions = await questionService.generateQuestions(requirements);
        console.log('Generated questions:', questions);
        setInterviewQuestions(questions);
        
        // Generate WhatsApp pitches for only the top 3 matches
        const pitches = await Promise.all(
          results.slice(0, 3).map(async result => ({
            name: result.helper.name,
            pitch: await pitchService.generatePitch(result.helper, requirements)
          }))
        );
        setWhatsappPitches(pitches);
      } else {
        setInterviewQuestions([]);
        setWhatsappPitches([]);
      }
    } catch (error) {
      console.error('Error processing requirements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const avgMatchScore = matchingResults.length > 0 
    ? Math.round(matchingResults.reduce((sum, r) => sum + r.score, 0) / matchingResults.length)
    : 0;

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

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard 
          totalHelpers={matchingResults.length}
          availableHelpers={matchingResults.filter(r => r.helper.status === 'Available').length}
          totalMatches={matchingResults.length} 
          avgMatchScore={avgMatchScore}
        />;
      case 'matching':
        return (
          <div className="space-y-6">
            <ContactLookupForm 
              onContactFound={handleContactFound}
              onLookupContact={handleContactLookup}
            />
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Employer Requirements</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Use contact lookup above or fill in the details below to find the best matching helpers
                </p>
              </div>
              <div className="p-6">
                <EmployerRequirementsForm 
                  onSubmit={handleRequirementsSubmit}
                  initialData={currentRequirements || undefined}
                />
              </div>
            </div>
            
            {isLoading && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-lg font-medium">Loading data from Google Sheets...</p>
                  <p className="text-sm mt-2">This may take a few moments</p>
                </div>
              </div>
            )}
            
            {hasSearched && currentRequirements && !isLoading && (
              <MatchingResults 
                results={matchingResults}
                excludedBios={currentRequirements.excludedBios}
                customerName={currentRequirements.customerName}
                customerContact={currentRequirements.contact}
              />
            )}
          </div>
        );

      case 'questions':
        return (
          <div className="space-y-6">
            {interviewQuestions.length > 0 && currentRequirements && matchingResults.length > 0 ? (
              <InterviewQuestions 
                questions={interviewQuestions}
                helperCode={matchingResults[0].helper.code}
                customerName={currentRequirements.customerName}
                customerContact={currentRequirements.contact}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="text-gray-500">
                  <p className="text-lg font-medium mb-2">No Interview Questions Generated</p>
                  <p className="text-sm">
                    Please complete the helper matching process first to generate interview questions from Google Sheets.
                  </p>
                  <button
                    onClick={() => setActiveTab('matching')}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Go to Matching
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'pitch':
        return (
          <div className="space-y-6">
            {whatsappPitches.length > 0 && currentRequirements ? (
              <WhatsAppPitch 
                pitches={whatsappPitches}
                customerName={currentRequirements.customerName}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="text-gray-500">
                  <p className="text-lg font-medium mb-2">No WhatsApp Pitches Generated</p>
                  <p className="text-sm">
                    Please complete the helper matching process first to generate WhatsApp pitches using Google Sheets data.
                  </p>
                  <button
                    onClick={() => setActiveTab('matching')}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Go to Matching
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'sheets':
        return (
          <GoogleSheetsConnection apiKey={apiKey} />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header apiKey={apiKey} />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              © 2025 Bliss Helper. All rights reserved.
            </p>
            <p className="text-sm text-gray-600">
              We are in a professional environment and maintain professional standards in all communications.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
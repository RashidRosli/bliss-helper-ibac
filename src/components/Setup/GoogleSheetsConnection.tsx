import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Database, RefreshCw } from 'lucide-react';
import { GoogleSheetsService } from '../../services/googleSheetsService';

interface GoogleSheetsConnectionProps {
  apiKey: string;
}

interface SheetStatus {
  id: string;
  name: string;
  connected: boolean;
  lastChecked: Date;
  rowCount?: number;
}

export const GoogleSheetsConnection: React.FC<GoogleSheetsConnectionProps> = ({ apiKey }) => {
  const [sheetsStatus, setSheetsStatus] = useState<SheetStatus[]>([
    { id: '1ohjfGkv9NBGTOQ5hmGizWKOPck9xFaZghBepl02Xch0', name: 'Helper Masterdata', connected: false, lastChecked: new Date() },
    { id: '1kDtQAwEkNW6PTjxOchWYuYKNOnGbwTIULrQsw9SnLmc', name: 'Questions', connected: false, lastChecked: new Date() },
    { id: '1Lj2nZKcVJMeITFX9StMXdNeXkOAtKZLOpb84X1HH0nE', name: 'Value Content', connected: false, lastChecked: new Date() }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const googleSheetsService = new GoogleSheetsService();

  const checkSheetConnections = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedStatus = [...sheetsStatus];
      
      // Check Helper Masterdata sheet
      try {
        const helperData = await googleSheetsService.getHelperData();
        const helperIndex = updatedStatus.findIndex(s => s.name === 'Helper Masterdata');
        updatedStatus[helperIndex].connected = helperData.length > 0;
        updatedStatus[helperIndex].rowCount = helperData.length;
        updatedStatus[helperIndex].lastChecked = new Date();
      } catch (err) {
        const helperIndex = updatedStatus.findIndex(s => s.name === 'Helper Masterdata');
        updatedStatus[helperIndex].connected = false;
        updatedStatus[helperIndex].lastChecked = new Date();
      }
      
      // Check Questions sheet
      try {
        const questionsData = await googleSheetsService.getQuestions();
        const questionsIndex = updatedStatus.findIndex(s => s.name === 'Questions');
        updatedStatus[questionsIndex].connected = questionsData.length > 0;
        updatedStatus[questionsIndex].rowCount = questionsData.length;
        updatedStatus[questionsIndex].lastChecked = new Date();
      } catch (err) {
        const questionsIndex = updatedStatus.findIndex(s => s.name === 'Questions');
        updatedStatus[questionsIndex].connected = false;
        updatedStatus[questionsIndex].lastChecked = new Date();
      }
      
      // Check Value Content sheet
      try {
        const contentData = await googleSheetsService.getValueContent();
        const contentIndex = updatedStatus.findIndex(s => s.name === 'Value Content');
        updatedStatus[contentIndex].connected = contentData.length > 0;
        updatedStatus[contentIndex].rowCount = contentData.length;
        updatedStatus[contentIndex].lastChecked = new Date();
      } catch (err) {
        const contentIndex = updatedStatus.findIndex(s => s.name === 'Value Content');
        updatedStatus[contentIndex].connected = false;
        updatedStatus[contentIndex].lastChecked = new Date();
      }
      
      setSheetsStatus(updatedStatus);
    } catch (err) {
      setError('Failed to check Google Sheets connection');
      console.error('Error checking sheet connections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (apiKey) {
      checkSheetConnections();
    }
  }, [apiKey]);

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Google Sheets Connection Status</h2>
          <p className="text-sm text-gray-600 mt-1">
            Verify connection to required Google Sheets for the application
          </p>
        </div>
        <button 
          onClick={checkSheetConnections}
          disabled={isLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}
      
      <div className="p-6">
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sheet Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rows</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Checked</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sheetsStatus.map((sheet) => (
                <tr key={sheet.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Database className="h-4 w-4 text-gray-400 mr-2" />
                      <div className="text-sm font-medium text-gray-900">{sheet.name}</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{sheet.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {sheet.connected ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                          <span className="text-sm text-green-600 font-medium">Connected</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                          <span className="text-sm text-red-600 font-medium">Not Connected</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sheet.rowCount || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sheet.lastChecked.toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
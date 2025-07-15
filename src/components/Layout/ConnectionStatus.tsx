import React, { useState, useEffect } from 'react';
import { CheckCircle, Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatusProps {
  apiKey: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ apiKey }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkConnection = async () => {
    if (!apiKey) {
      setIsConnected(false);
      return;
    }

    setIsChecking(true);
    try {
      // Quick test to see if we can access the helper data
      const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/1ohjfGkv9NBGTOQ5hmGizWKOPck9xFaZghBepl02Xch0/values/Helper%20Masterdata!A1:A1?key=${apiKey}`;
      const response = await fetch(testUrl);
      setIsConnected(response.ok);
      setLastChecked(new Date());
    } catch (error) {
      setIsConnected(false);
      setLastChecked(new Date());
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
    // Check connection every 5 minutes
    const interval = setInterval(checkConnection, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [apiKey]);

  if (isConnected === null && !isChecking) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      {isChecking ? (
        <div className="flex items-center space-x-2 text-yellow-600">
          <Wifi className="h-4 w-4 animate-pulse" />
          <span className="text-sm font-medium">Checking...</span>
        </div>
      ) : isConnected ? (
        <div className="flex items-center space-x-2 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Google Sheets Connected</span>
        </div>
      ) : (
        <div className="flex items-center space-x-2 text-red-600">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Not Connected</span>
        </div>
      )}
      
      {lastChecked && (
        <span className="text-xs text-gray-500">
          Last checked: {lastChecked.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};
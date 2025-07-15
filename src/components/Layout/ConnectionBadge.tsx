import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface ConnectionBadgeProps {
  apiKey: string;
}

export const ConnectionBadge: React.FC<ConnectionBadgeProps> = ({ apiKey }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = async () => {
    if (!apiKey) {
      setIsConnected(false);
      return;
    }

    setIsChecking(true);
    try {
      const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/1ohjfGkv9NBGTOQ5hmGizWKOPck9xFaZghBepl02Xch0/values/Helper%20Masterdata!A1:A1?key=${apiKey}`;
      const response = await fetch(testUrl);
      setIsConnected(response.ok);
    } catch (error) {
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, [apiKey]);

  if (isConnected === null && !isChecking) {
    return null;
  }

  return (
    <div 
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium cursor-pointer ${
        isChecking 
          ? 'bg-yellow-100 text-yellow-800'
          : isConnected 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}
      onClick={checkConnection}
      title="Click to refresh connection status"
    >
      {isChecking ? (
        <>
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Checking
        </>
      ) : isConnected ? (
        <>
          <CheckCircle className="h-3 w-3 mr-1" />
          Connected
        </>
      ) : (
        <>
          <AlertCircle className="h-3 w-3 mr-1" />
          Disconnected
        </>
      )}
    </div>
  );
};
import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle, Wifi, WifiOff, RefreshCw } from "lucide-react";

interface ConnectionStatusProps {
  apiKey: string;
  spreadsheetId?: string;
  pollIntervalMs?: number;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  apiKey,
  spreadsheetId = "1ohjfGkv9NBGTOQ5hmGizWKOPck9xFaZghBepl02Xch0",
  pollIntervalMs = 5 * 60 * 1000, // Default: 5 minutes
}) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkConnection = useCallback(async () => {
    if (!apiKey) {
      setIsConnected(false);
      setLastChecked(new Date());
      return;
    }
    setIsChecking(true);
    try {
      const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Helper%20Masterdata!A1:A1?key=${apiKey}`;
      const response = await fetch(testUrl);
      setIsConnected(response.ok);
      setLastChecked(new Date());
    } catch (error) {
      setIsConnected(false);
      setLastChecked(new Date());
      // Optionally log error
      // console.error("Connection check failed:", error);
    } finally {
      setIsChecking(false);
    }
  }, [apiKey, spreadsheetId]);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, pollIntervalMs);
    return () => clearInterval(interval);
  }, [checkConnection, pollIntervalMs]);

  if (isConnected === null && !isChecking) return null;

  return (
    <div className="flex items-center space-x-2" aria-live="polite">
      <button
        className="focus:outline-none"
        onClick={checkConnection}
        disabled={isChecking}
        title="Refresh connection status"
        type="button"
        tabIndex={0}
      >
        {isChecking ? (
          <span className="flex items-center text-yellow-600">
            <RefreshCw className="h-4 w-4 animate-spin mr-1" />
            Checking...
          </span>
        ) : isConnected ? (
          <span className="flex items-center text-green-600">
            <CheckCircle className="h-4 w-4 mr-1" />
            Google Sheets Connected
          </span>
        ) : (
          <span className="flex items-center text-red-600">
            <WifiOff className="h-4 w-4 mr-1" />
            Not Connected
          </span>
        )}
      </button>
      {lastChecked && (
        <span className="text-xs text-gray-500">
          Last checked: {lastChecked.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

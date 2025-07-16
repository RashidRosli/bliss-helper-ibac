import React, { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

interface ConnectionBadgeProps {
  apiKey: string;
  spreadsheetId?: string; // Optional, allows for config
  onStatusChange?: (status: boolean) => void; // For parent notification
}

export const ConnectionBadge: React.FC<ConnectionBadgeProps> = ({
  apiKey,
  spreadsheetId = "1ohjfGkv9NBGTOQ5hmGizWKOPck9xFaZghBepl02Xch0",
  onStatusChange,
}) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = async () => {
    if (!apiKey) {
      setIsConnected(false);
      onStatusChange?.(false);
      return;
    }
    setIsChecking(true);
    try {
      const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Helper%20Masterdata!A1:A1?key=${apiKey}`;
      const response = await fetch(testUrl);
      setIsConnected(response.ok);
      onStatusChange?.(response.ok);
    } catch (error) {
      setIsConnected(false);
      onStatusChange?.(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
    // eslint-disable-next-line
  }, [apiKey, spreadsheetId]);

  if (isConnected === null && !isChecking) return null;

  return (
    <button
      type="button"
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium focus:ring-2 focus:ring-offset-2 transition cursor-pointer ${
        isChecking
          ? "bg-yellow-100 text-yellow-800"
          : isConnected
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800"
      }`}
      onClick={checkConnection}
      title="Click to refresh connection status"
      aria-live="polite"
      aria-label={`Google Sheets connection status: ${isChecking ? "checking" : isConnected ? "connected" : "disconnected"}`}
      tabIndex={0}
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
    </button>
  );
};

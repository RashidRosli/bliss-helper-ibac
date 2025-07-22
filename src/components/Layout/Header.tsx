import React from 'react';
import { Users } from 'lucide-react';
import { ConnectionBadge } from './ConnectionBadge';

interface HeaderProps {
  apiKey?: string;
}

export const Header: React.FC<HeaderProps> = ({ apiKey = '' }) => {
  return (
    <header
      className="bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg border-b border-orange-700/20"
      role="banner"
      aria-label="Application header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="bg-orange-500 p-2 rounded-full shadow-md transform hover:scale-105 transition-all duration-300">
              <Users className="h-7 w-7 text-white animate-pulse" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                IBAC Bliss Helper
              </h1>
              <p className="text-sm text-teal-600 font-bold">Helper Matching System</p>
            </div>
          </div>

          {/* Connection Badge */}
          {apiKey && (
            <div className="relative group">
              <ConnectionBadge apiKey={apiKey} />
              <span className="absolute hidden group-hover:block bg-gray-800 text-white text-xs px-3 py-1.5 rounded-md shadow-md -bottom-10 left-1/2 transform -translate-x-1/2">
                API Key: {apiKey.slice(0, 8)}...
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
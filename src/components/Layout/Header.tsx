import React from 'react';
import { ConnectionBadge } from './ConnectionBadge';
import { Users, Phone, Mail } from 'lucide-react';

interface HeaderProps {
  apiKey?: string;
}

export const Header: React.FC<HeaderProps> = ({ apiKey = '' }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">ISAC Bliss Helper</h1>
              <p className="text-sm text-gray-600">Helper Matching System</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {apiKey && <ConnectionBadge apiKey={apiKey} />}
            <div className="flex items-center space-x-2 text-gray-600">
              <Phone className="h-4 w-4" />
              <span className="text-sm">+65 6123 4567</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Mail className="h-4 w-4" />
              <span className="text-sm">help@blisshelper.sg</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
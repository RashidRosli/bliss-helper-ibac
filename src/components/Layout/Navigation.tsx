// src/components/Layout/Navigation.tsx

import React, { KeyboardEvent } from 'react';
import { Search, MessageCircle, FileText, BarChart3, Database, ListChecks } from 'lucide-react';

// Add 'results' here
export type TabType = 'matching' | 'results' | 'questions' | 'pitch' | 'dashboard' | 'sheets';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'matching', label: 'Helper Matching', icon: Search },
  { id: 'results', label: 'Results', icon: ListChecks },
  { id: 'questions', label: 'Interview Questions', icon: FileText },
  { id: 'pitch', label: 'WhatsApp Pitch', icon: MessageCircle },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'sheets', label: 'Google Sheets', icon: Database },
];

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      onTabChange(tabs[(idx + 1) % tabs.length].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onTabChange(tabs[(idx - 1 + tabs.length) % tabs.length].id);
    }
  };

  return (
    <nav className="bg-gray-50 border-b border-gray-200" aria-label="Primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
        <div
          className="flex space-x-2 sm:space-x-8"
          role="tablist"
          aria-orientation="horizontal"
        >
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? 'page' : undefined}
                tabIndex={isActive ? 0 : -1}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500
                  ${isActive
                    ? 'border-blue-500 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

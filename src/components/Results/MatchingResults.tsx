import React from 'react';
import { MatchResult } from '../../types';
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  User,
  Globe,
  Star,
  Calendar,
  DollarSign,
} from 'lucide-react';

interface MatchingResultsProps {
  results: MatchResult[];
  excludedBios: string[];
  customerName: string;
  customerContact: string;
}

export const MatchingResults: React.FC<MatchingResultsProps> = ({
  results,
  excludedBios,
  customerName,
  customerContact,
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'match':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'mismatch':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusSymbol = (status: string) => {
    switch (status) {
      case 'match': return '✅';
      case 'partial': return '⚠️';
      case 'mismatch': return '❌';
      default: return '❌';
    }
  };

  const getMatchSummary = (matches: any[]) => {
    const fullMatches = matches.filter(m => m.status === 'match');
    const partialMatches = matches.filter(m => m.status === 'partial');
    const mismatches = matches.filter(m => m.status === 'mismatch');

    return {
      full: fullMatches.map(m => m.criteria),
      partial: partialMatches.map(m => m.criteria),
      missed: mismatches.map(m => m.criteria),
    };
  };

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
          <AlertCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-800 mb-2">No Available Helpers</h3>
          <p className="text-blue-700">
            No helpers are currently available that meet your basic requirements. Please check back later or contact us for assistance.
          </p>
        </div>
      </div>
    );
  }

  // Add a notice for low-score matches
  const hasLowScoreMatches = results.some(r => r.score < 30);

  return (
    <div className="space-y-6">
      {/* Low match score warning */}
      {hasLowScoreMatches && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">Limited Matches Found</h3>
          </div>
          <p className="text-yellow-700 mt-2 text-sm">
            Some results have lower match scores. Consider adjusting your criteria for better matches, or contact us to discuss alternatives.
          </p>
        </div>
      )}

      {/* Excluded bios section */}
      {excludedBios.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-2">❌ Excluded bios (previously sent):</h3>
          <ul className="text-red-700 space-y-1 list-disc pl-4">
            {excludedBios.map((bio, idx) => (
              <li key={`excluded-bio-${idx}`}>{bio}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Results Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Top matches for {customerName} ({customerContact})
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {results.slice(0, 3).map((result, index) => {
            const summary = getMatchSummary(result.matches);
            
            return (
              <div key={`helper-result-${index}`} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {result.helper.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Helper Code: {result.helper.code || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-lg font-semibold text-gray-900">{result.score}%</span>
                    </div>
                    <p className="text-sm text-gray-600">Match Score</p>
                  </div>
                </div>

                {/* Helper Overview */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-gray-500" />
                      <span>{result.helper.nationality}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span>{result.helper.age} years</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>{result.helper.experience} years exp</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span>SGD {result.helper.salary}</span>
                    </div>
                  </div>
                </div>

                {/* Matching Criteria Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Criteria</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Score</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Data Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {result.matches.map((match, matchIndex) => (
                        <tr key={`match-row-${matchIndex}`} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">
                            {match.criteria}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              {getStatusIcon(match.status)}
                              <span className="text-sm">{getStatusSymbol(match.status)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {match.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Tailored Summary */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Tailored Summary:</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>% Match:</strong> {result.score}%</p>
                    
                    {summary.full.length > 0 && (
                      <p><strong>Strong matches:</strong> {summary.full.join(', ')}</p>
                    )}
                    
                    {summary.partial.length > 0 && (
                      <p><strong>Partial matches:</strong> {summary.partial.join(', ')}</p>
                    )}
                    
                    {summary.missed.length > 0 && (
                      <p><strong>Not matched:</strong> {summary.missed.join(', ')}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
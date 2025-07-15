import React from 'react';
import { MessageCircle, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface WhatsAppPitchProps {
  pitches: Array<{
    name: string;
    pitch: string;
  }>;
  customerName: string;
}

export const WhatsAppPitch: React.FC<WhatsAppPitchProps> = ({
  pitches,
  customerName
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            WhatsApp Helper Recommendations for {customerName}
          </h2>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-6">
          {pitches.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {index === 0 ? 'First' : index === 1 ? 'Second' : 'Third'} helper:
                </h3>
                <button
                  onClick={() => handleCopy(item.pitch, index)}
                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-600">Copy</span>
                    </>
                  )}
                </button>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-gray-900 leading-relaxed">
                  {item.pitch}
                </p>
              </div>
              
              <div className="mt-2 text-sm text-gray-600">
                <strong>Helper:</strong> {item.name} | <strong>Word count:</strong> {item.pitch.split(' ').length}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">WhatsApp Best Practices:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Send one helper recommendation at a time</li>
            <li>• Wait for client response before sending the next option</li>
            <li>• Include helper's key strengths that match client needs</li>
            <li>• Keep messages concise and professional</li>
            <li>• Follow up within 24 hours if no response</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from "react";
import { FileText, MessageCircle, CheckCircle } from "lucide-react";
import { EmployerRequirements } from "../../types";
// You must have a service like this:
import { QuestionService } from "../../services/questionService";

interface InterviewQuestionsProps {
  requirements: EmployerRequirements | null;
}

export const InterviewQuestions: React.FC<InterviewQuestionsProps> = ({
  requirements,
}) => {
  const [questions, setQuestions] = useState<
    Array<{ question: string; reason: string }>
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchQuestions() {
      if (!requirements) return;
      setLoading(true);
      try {
        const service = new QuestionService();
        const qs = await service.generateQuestions(requirements);
        if (!cancelled) setQuestions(qs || []);
      } catch (err) {
        if (!cancelled) setQuestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchQuestions();
    return () => {
      cancelled = true;
    };
  }, [requirements]);

  const getQuestionCategory = (index: number) => {
    if (index < 3) return "Opening";
    if (index >= questions.length - 3) return "Closing";
    return "Assessment";
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Opening":
        return "bg-green-100 text-green-800";
      case "Closing":
        return "bg-red-100 text-red-800";
      case "Assessment":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Opening":
        return <CheckCircle className="h-4 w-4" />;
      case "Closing":
        return <FileText className="h-4 w-4" />;
      case "Assessment":
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (!requirements) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-600 mb-2">No requirements selected yet.</p>
        <p className="text-sm text-gray-400">
          Please match a helper first, then view interview questions here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          Interview Questions for {requirements.customerName} (
          {requirements.contact})
        </h2>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="text-center text-blue-500 py-8">Loading questions...</div>
        ) : questions.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No questions generated yet.
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((item, index) => {
              const category = getQuestionCategory(index);
              const questionNumber = index + 1;
              return (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {questionNumber}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(
                            category
                          )}`}
                        >
                          {getCategoryIcon(category)}
                          <span>{category}</span>
                        </span>
                      </div>
                      <p className="text-gray-900 font-medium mb-2">
                        {item.question}
                      </p>
                      <p className="text-sm text-gray-600 italic">
                        <strong>Reason:</strong> {item.reason}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">Interview Tips:</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Allow the helper to answer fully before asking follow-up questions</li>
            <li>• Pay attention to body language and confidence level</li>
            <li>• Ask for specific examples when discussing experience</li>
            <li>• Ensure all compulsory questions are covered</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

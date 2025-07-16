import React from "react";

interface EmployerPageProps {
  onStartLookup: () => void;
  onStartForm: () => void;
}

export const EmployerPage: React.FC<EmployerPageProps> = ({
  onStartLookup,
  onStartForm,
}) => (
  <div className="max-w-3xl mx-auto py-8 space-y-8">
    <div className="grid gap-6">
      <h2 className="text-2xl font-bold text-center mb-4">
        How would you like to match a helper?
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <button
          onClick={onStartLookup}
          className="rounded-2xl border shadow p-8 text-lg font-semibold hover:bg-blue-50 transition"
          type="button"
        >
          Quick Customer Lookup
          <div className="text-sm font-normal mt-2 text-gray-500">
            Fast search for existing customers
          </div>
        </button>
        <button
          onClick={onStartForm}
          className="rounded-2xl border shadow p-8 text-lg font-semibold hover:bg-blue-50 transition"
          type="button"
        >
          Employer Requirements Form
          <div className="text-sm font-normal mt-2 text-gray-500">
            Fill details for custom matching
          </div>
        </button>
      </div>
    </div>
  </div>
);

export default EmployerPage;

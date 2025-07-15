import React, { useState } from 'react';
import { EmployerRequirements } from '../../types';
import { User, Home, Mail, DollarSign, Globe } from 'lucide-react'; // Removed unused Phone and Calendar

interface EmployerRequirementsFormProps {
  onSubmit: (requirements: EmployerRequirements) => void;
  initialData?: Partial<EmployerRequirements>;
}

export const EmployerRequirementsForm: React.FC<EmployerRequirementsFormProps> = ({
  onSubmit,
  initialData
}) => {
  const [formData, setFormData] = useState<EmployerRequirements>({
    customerName: initialData?.customerName || '',
    contact: initialData?.contact || '',
    email: initialData?.email || '',
    referralSource: initialData?.referralSource || '',
    employerRace: initialData?.employerRace || '',
    jobscope: initialData?.jobscope || [],
    firstTimeHelper: initialData?.firstTimeHelper || false,
    childrenAges: initialData?.childrenAges || [],
    elderlyRelationship: initialData?.elderlyRelationship || '',
    pets: initialData?.pets || [],
    residenceType: initialData?.residenceType || '',
    roomSharing: initialData?.roomSharing || false,
    startDate: initialData?.startDate || '',
    preferences: initialData?.preferences || '',
    budget: initialData?.budget || 0,
    nationalityPreferences: initialData?.nationalityPreferences || [],
    helperType: initialData?.helperType || '',
    agePreference: initialData?.agePreference || '',
    englishRequirement: initialData?.englishRequirement || '',
    heightPreference: initialData?.heightPreference || '',
    weightPreference: initialData?.weightPreference || '',
    experienceTags: initialData?.experienceTags || [],
    religionPreference: initialData?.religionPreference || '',
    educationRequirement: initialData?.educationRequirement || '',
    maritalPreference: initialData?.maritalPreference || '',
    helperChildrenAges: initialData?.helperChildrenAges || '',
    focusArea: initialData?.focusArea || [],
    excludedBios: initialData?.excludedBios || []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleJobscopeChange = (job: string) => {
    setFormData(prev => ({
      ...prev,
      jobscope: prev.jobscope.includes(job)
        ? prev.jobscope.filter(j => j !== job)
        : [...prev.jobscope, job]
    }));
  };

  const handleChildrenAgesChange = (age: string) => {
    setFormData(prev => ({
      ...prev,
      childrenAges: prev.childrenAges.includes(age)
        ? prev.childrenAges.filter(a => a !== age)
        : [...prev.childrenAges, age]
    }));
  };

  const handlePetsChange = (pet: string) => {
    setFormData(prev => ({
      ...prev,
      pets: prev.pets.includes(pet)
        ? prev.pets.filter(p => p !== pet)
        : [...prev.pets, pet]
    }));
  };

  const handleNationalityChange = (nationality: string) => {
    setFormData(prev => ({
      ...prev,
      nationalityPreferences: prev.nationalityPreferences.includes(nationality)
        ? prev.nationalityPreferences.filter(n => n !== nationality)
        : [...prev.nationalityPreferences, nationality]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <User className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name of Client *
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact *
            </label>
            <input
              type="tel"
              value={formData.contact}
              onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <div className="flex items-center">
              <Mail className="h-4 w-4 text-gray-500 mr-2" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How did they reach us
            </label>
            <select
              value={formData.referralSource}
              onChange={(e) => setFormData(prev => ({ ...prev, referralSource: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select source</option>
              <option value="referral">Referral</option>
              <option value="google">Google</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employer Race
            </label>
            <select
              value={formData.employerRace}
              onChange={(e) => setFormData(prev => ({ ...prev, employerRace: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select race</option>
              <option value="chinese">Chinese</option>
              <option value="malay">Malay</option>
              <option value="indian">Indian</option>
              <option value="caucasian">Caucasian</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Job Requirements */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <Home className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Job Requirements</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Scope *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['housework', 'cooking', 'childcare', 'eldercare'].map(job => (
                <label key={job} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.jobscope.includes(job)}
                    onChange={() => handleJobscopeChange(job)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">{job}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Time Hiring
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={formData.firstTimeHelper === true}
                  onChange={() => setFormData(prev => ({ ...prev, firstTimeHelper: true }))}
                  className="rounded-full border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Yes</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={formData.firstTimeHelper === false}
                  onChange={() => setFormData(prev => ({ ...prev, firstTimeHelper: false }))}
                  className="rounded-full border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">No</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Family Details */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <User className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Family Details</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Age of Kids
            </label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {['0-1', '2-3', '4-5', '6-8', '9-12', '13+'].map(age => (
                <label key={age} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.childrenAges.includes(age)}
                    onChange={() => handleChildrenAgesChange(age)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{age}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Relationship of Elderly
            </label>
            <select
              value={formData.elderlyRelationship}
              onChange={(e) => setFormData(prev => ({ ...prev, elderlyRelationship: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select relationship</option>
              <option value="parents">Parents</option>
              <option value="grandparents">Grandparents</option>
              <option value="relatives">Other relatives</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pets
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['dogs', 'cats', 'birds', 'others'].map(pet => (
                <label key={pet} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.pets.includes(pet)}
                    onChange={() => handlePetsChange(pet)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">{pet}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type of Residence
            </label>
            <select
              value={formData.residenceType}
              onChange={(e) => setFormData(prev => ({ ...prev, residenceType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select residence type</option>
              <option value="hdb">HDB</option>
              <option value="condo">Condominium</option>
              <option value="landed">Landed Property</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Sharing
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={formData.roomSharing === true}
                  onChange={() => setFormData(prev => ({ ...prev, roomSharing: true }))}
                  className="rounded-full border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Yes</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={formData.roomSharing === false}
                  onChange={() => setFormData(prev => ({ ...prev, roomSharing: false }))}
                  className="rounded-full border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">No</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Budget & Timeline */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <DollarSign className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Budget & Timeline</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Salary and Placement Budget (SGD) *
            </label>
            <input
              type="number"
              value={isNaN(formData.budget) ? '' : formData.budget}
              onChange={(e) => {
                const parsed = parseInt(e.target.value);
                setFormData(prev => ({ ...prev, budget: isNaN(parsed) ? 0 : parsed }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              When do you need the helper *
            </label>
            <input
              type="text"
              value={formData.startDate}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              placeholder="e.g., Urgent, 1 month, 2 months"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
      </div>

      {/* Helper Preferences */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <Globe className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Helper Preferences</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nationality Preference
            </label>
            <div className="grid grid-cols-1 gap-2">
              {['Myanmar', 'Philippines', 'Indonesia'].map(nationality => (
                <label key={nationality} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.nationalityPreferences.includes(nationality)}
                    onChange={() => handleNationalityChange(nationality)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{nationality}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type of Helper
            </label>
            <select
              value={formData.helperType}
              onChange={(e) => setFormData(prev => ({ ...prev, helperType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select helper type</option>
              <option value="new">New</option>
              <option value="transfer">Transfer</option>
              <option value="experienced">Experienced</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prefer Helper Age
            </label>
            <select
              value={formData.agePreference}
              onChange={(e) => setFormData(prev => ({ ...prev, agePreference: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any age</option>
              <option value="young">Young (20-30)</option>
              <option value="middle">Middle (30-40)</option>
              <option value="mature">Mature (40+)</option>
              <option value="experienced">Experienced (45+)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prefer Helper English Level
            </label>
            <select
              value={formData.englishRequirement}
              onChange={(e) => setFormData(prev => ({ ...prev, englishRequirement: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any level</option>
              <option value="Basic">Basic</option>
              <option value="Good">Good</option>
              <option value="Very Good">Very Good</option>
              <option value="Excellent">Excellent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prefer Helper Height (cm)
            </label>
            <input
              type="text"
              value={formData.heightPreference}
              onChange={(e) => setFormData(prev => ({ ...prev, heightPreference: e.target.value }))}
              placeholder="e.g., 150-170"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prefer Helper Weight (kg)
            </label>
            <input
              type="text"
              value={formData.weightPreference}
              onChange={(e) => setFormData(prev => ({ ...prev, weightPreference: e.target.value }))}
              placeholder="e.g., 45-65"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prefer Helper Experience in Infant/Child/Elder Care
            </label>
            <select
              value={formData.experienceTags.join(',')}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                experienceTags: e.target.value ? e.target.value.split(',') : []
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select experience</option>
              <option value="infant">Infant Care</option>
              <option value="child">Child Care</option>
              <option value="elder">Elder Care</option>
              <option value="infant,child">Infant & Child Care</option>
              <option value="infant,elder">Infant & Elder Care</option>
              <option value="child,elder">Child & Elder Care</option>
              <option value="infant,child,elder">All Care Types</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prefer Helper Religion
            </label>
            <select
              value={formData.religionPreference}
              onChange={(e) => setFormData(prev => ({ ...prev, religionPreference: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any religion</option>
              <option value="Christian">Christian</option>
              <option value="Catholic">Catholic</option>
              <option value="Muslim">Muslim</option>
              <option value="Buddhist">Buddhist</option>
              <option value="Hindu">Hindu</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prefer Helper Education
            </label>
            <select
              value={formData.educationRequirement}
              onChange={(e) => setFormData(prev => ({ ...prev, educationRequirement: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any education</option>
              <option value="Primary">Primary</option>
              <option value="High School">High School</option>
              <option value="Diploma">Diploma</option>
              <option value="College">College</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prefer Helper Marital Status
            </label>
            <select
              value={formData.maritalPreference}
              onChange={(e) => setFormData(prev => ({ ...prev, maritalPreference: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any status</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Separated">Separated</option>
              <option value="Widowed">Widowed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prefer Helper Children Age
            </label>
            <input
              type="text"
              value={formData.helperChildrenAges}
              onChange={(e) => setFormData(prev => ({ ...prev, helperChildrenAges: e.target.value }))}
              placeholder="e.g., No children, Above 5 years"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preference Remarks
            </label>
            <textarea
              value={formData.preferences}
              onChange={(e) => setFormData(prev => ({ ...prev, preferences: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any specific requirements or preferences..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Excluded Helper Codes
            </label>
            <input
              type="text"
              value={formData.excludedBios.join(', ')}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                excludedBios: e.target.value.split(',').map(s => s.trim()).filter(s => s)
              }))}
              placeholder="e.g., SG/MYA/2024001, SG/IND/2024002"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Find Matching Helpers
        </button>
      </div>
    </form>
  );
};
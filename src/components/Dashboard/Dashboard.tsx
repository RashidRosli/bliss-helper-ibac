import React from 'react';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  Star, 
  CheckCircle,
  Clock,
  Phone,
  MessageSquare
} from 'lucide-react';

interface DashboardProps {
  totalHelpers: number;
  availableHelpers: number;
  totalMatches: number;
  avgMatchScore: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
  totalHelpers,
  availableHelpers,
  totalMatches,
  avgMatchScore
}) => {
  const stats = [
    {
      label: 'Total Helpers',
      value: totalHelpers,
      icon: Users,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      label: 'Available Now',
      value: availableHelpers,
      icon: CheckCircle,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      label: 'Matches Found',
      value: totalMatches,
      icon: TrendingUp,
      color: 'bg-purple-500',
      textColor: 'text-purple-600'
    },
    {
      label: 'Avg Match Score',
      value: `${avgMatchScore}%`,
      icon: Star,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    }
  ];

  const recentActivity = [
    {
      type: 'match',
      message: 'Found 3 matches for Mrs. Chen',
      time: '2 hours ago',
      icon: Users
    },
    {
      type: 'interview',
      message: 'Generated interview questions for SG/MYA/2024001',
      time: '3 hours ago',
      icon: MessageSquare
    },
    {
      type: 'pitch',
      message: 'Created WhatsApp pitch for Mr. Tan',
      time: '5 hours ago',
      icon: Phone
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Icon className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500 flex items-center mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        {activity.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">Find New Matches</span>
                </div>
              </button>
              
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">Generate Interview Questions</span>
                </div>
              </button>
              
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">Create WhatsApp Pitch</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Today's Performance</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">12</div>
              <div className="text-sm text-gray-600">Searches Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">36</div>
              <div className="text-sm text-gray-600">Matches Found</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">8</div>
              <div className="text-sm text-gray-600">Pitches Created</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Eye, 
  Users, 
  Calendar,
  BarChart3,
  Download,
  RefreshCw
} from 'lucide-react';
import { AdminService } from '@/services/adminService';
import type { DailySummary, VisitorAnalytics } from '@/types/admin';

export const AdminAnalyticsPanel: React.FC = () => {
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);
  const [visitorAnalytics, setVisitorAnalytics] = useState<VisitorAnalytics[]>([]);
  const [visitorStats, setVisitorStats] = useState<{
    total: number;
    anonymous: number;
    registered: number;
    unique: number;
  }>({ total: 0, anonymous: 0, registered: 0, unique: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [summary, visitors] = await Promise.all([
        AdminService.getDailySummary(parseInt(timeRange)),
        AdminService.getVisitorAnalytics(selectedDate || undefined)
      ]);
      setDailySummary(summary);
      setVisitorAnalytics(visitors);
      
      // Calculate visitor statistics
      const today = new Date().toISOString().split('T')[0];
      const todayVisitors = visitors.filter(v => v.visit_date === today);
      const uniqueSessions = new Set(todayVisitors.map(v => v.session_id));
      const anonymousVisitors = new Set(
        todayVisitors.filter(v => !v.user_id).map(v => v.session_id)
      );
      const registeredVisitors = new Set(
        todayVisitors.filter(v => v.user_id).map(v => v.session_id)
      );
      
      setVisitorStats({
        total: todayVisitors.length,
        unique: uniqueSessions.size,
        anonymous: anonymousVisitors.size,
        registered: registeredVisitors.size
      });
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    return dailySummary.find(day => day.date === today);
  };

  const todayStats = getTodayStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-white shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Analytics Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <Card className="bg-white shadow-lg border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Analytics Overview
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={loadAnalytics} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Today's Visitors */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Today's Visitors</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {todayStats?.total_visitors || 0}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {todayStats?.unique_visitors || 0} unique
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">
                  <Eye className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>

            {/* New Users Today */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">New Users</p>
                  <p className="text-2xl font-bold text-green-900">
                    {todayStats?.new_users || 0}
                  </p>
                  <p className="text-xs text-green-700 mt-1">Today</p>
                </div>
                <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </div>

            {/* Games Played Today */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Games Played</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {todayStats?.games_played || 0}
                  </p>
                  <p className="text-xs text-purple-700 mt-1">Today</p>
                </div>
                <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Returning Visitors */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600">Returning</p>
                  <p className="text-2xl font-bold text-amber-900">
                    {todayStats?.returning_visitors || 0}
                  </p>
                  <p className="text-xs text-amber-700 mt-1">Visitors</p>
                </div>
                <div className="w-10 h-10 bg-amber-200 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visitor Breakdown */}
      <Card className="bg-white shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visitor Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Page Views */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Page Views</p>
                  <p className="text-2xl font-bold text-gray-900">{visitorStats.total}</p>
                  <p className="text-xs text-gray-700 mt-1">Today</p>
                </div>
                <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </div>

            {/* Unique Visitors */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Unique Visitors</p>
                  <p className="text-2xl font-bold text-blue-900">{visitorStats.unique}</p>
                  <p className="text-xs text-blue-700 mt-1">By session</p>
                </div>
                <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Anonymous Visitors */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Anonymous Visitors</p>
                  <p className="text-2xl font-bold text-orange-900">{visitorStats.anonymous}</p>
                  <p className="text-xs text-orange-700 mt-1">Not logged in</p>
                </div>
                <div className="w-10 h-10 bg-orange-200 rounded-lg flex items-center justify-center">
                  <Eye className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Registered Visitors */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Registered Visitors</p>
                  <p className="text-2xl font-bold text-green-900">{visitorStats.registered}</p>
                  <p className="text-xs text-green-700 mt-1">Logged in users</p>
                </div>
                <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Visitor Percentage Breakdown */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Visitor Distribution</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Anonymous vs Registered</span>
                <span className="text-sm font-medium text-gray-900">
                  {visitorStats.unique > 0 
                    ? `${Math.round((visitorStats.anonymous / visitorStats.unique) * 100)}% / ${Math.round((visitorStats.registered / visitorStats.unique) * 100)}%`
                    : '0% / 0%'
                  }
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-orange-400 to-green-400 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${visitorStats.unique > 0 ? (visitorStats.anonymous / visitorStats.unique) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Summary Chart */}
      <Card className="bg-white shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Visitor Trends ({timeRange} days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dailySummary.slice(0, 10).map((day) => (
              <div key={day.date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="text-sm font-medium text-gray-900">
                    {new Date(day.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span>{day.total_visitors || 0} total</span>
                    <span>{day.unique_visitors || 0} unique</span>
                    <span>{day.new_users || 0} new</span>
                    <span>{day.games_played || 0} games</span>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {day.returning_visitors || 0} returning
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Visitors */}
      <Card className="bg-white shadow-lg border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Recent Visitors
            </CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {visitorAnalytics.slice(0, 10).map((visitor) => (
              <div key={visitor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {visitor.user_id ? 'U' : 'A'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {visitor.user_id ? 'Registered User' : 'Anonymous'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {visitor.page_visited} • {new Date(visitor.visit_time || '').toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {visitor.session_id.slice(0, 8)}...
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 
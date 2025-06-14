import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { safeQuery, testDatabaseConnectivity } from '@/utils/databaseUtils';

export const DatabaseDebugPanel: React.FC = () => {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const testDatabase = async () => {
    setLoading(true);
    const testResults: any = {};

    try {
      console.log('🧪 Starting comprehensive database tests...');

      // Test 0: Basic connectivity
      console.log('Test 0: Basic connectivity');
      const isConnected = await testDatabaseConnectivity();
      testResults.connectivity = {
        success: isConnected,
        error: isConnected ? null : 'Failed to connect to database'
      };

      // Test 1: Check user_profiles table
      console.log('Test 1: user_profiles table');
      const { data: profilesData, error: profilesError, timedOut: profilesTimeout } = await safeQuery(
        async () => {
          return await supabase
            .from('user_profiles' as any)
            .select('*')
            .limit(5);
        },
        { operation: 'Fetch user profiles', timeoutMs: 3000 }
      );
      
      testResults.profiles = {
        error: profilesError?.message || profilesData?.error?.message,
        timedOut: profilesTimeout,
        count: profilesData?.data?.length || 0,
        data: profilesData?.data || [],
        success: !profilesError && !profilesData?.error && !profilesTimeout
      };

      // Test 2: Check game_sessions table
      console.log('Test 2: game_sessions table');
      const { data: sessionsData, error: sessionsError, timedOut: sessionsTimeout } = await safeQuery(
        async () => {
          return await supabase
            .from('game_sessions' as any)
            .select('*')
            .limit(5);
        },
        { operation: 'Fetch game sessions', timeoutMs: 3000 }
      );
      
      testResults.sessions = {
        error: sessionsError?.message || sessionsData?.error?.message,
        timedOut: sessionsTimeout,
        count: sessionsData?.data?.length || 0,
        data: sessionsData?.data || [],
        success: !sessionsError && !sessionsData?.error && !sessionsTimeout
      };

      // Test 3: Check current user profile if logged in
      if (user) {
        console.log('Test 3: current user profile');
        const { data: userProfileData, error: userProfileError, timedOut: userProfileTimeout } = await safeQuery(
          async () => {
            return await supabase
              .from('user_profiles' as any)
              .select('*')
              .eq('user_id', user.id)
              .single();
          },
          { operation: 'Fetch current user profile', timeoutMs: 3000 }
        );
        
        testResults.currentUserProfile = {
          error: userProfileError?.message || userProfileData?.error?.message,
          timedOut: userProfileTimeout,
          data: userProfileData?.data,
          success: !userProfileError && !userProfileData?.error && !userProfileTimeout && !!userProfileData?.data
        };
      }

      // Test 4: Check completed game sessions
      console.log('Test 4: completed sessions');
      const { data: completedData, error: completedError, timedOut: completedTimeout } = await safeQuery(
        async () => {
          return await supabase
            .from('game_sessions' as any)
            .select('*')
            .not('completed_at', 'is', null)
            .limit(3);
        },
        { operation: 'Fetch completed sessions', timeoutMs: 3000 }
      );
      
      testResults.completedSessions = {
        error: completedError?.message || completedData?.error?.message,
        timedOut: completedTimeout,
        count: completedData?.data?.length || 0,
        data: completedData?.data || [],
        success: !completedError && !completedData?.error && !completedTimeout
      };

      setResults(testResults);
      console.log('✅ Database tests completed:', testResults);
      
      // Summary log
      const successCount = Object.values(testResults).filter((test: any) => test.success).length;
      const totalTests = Object.keys(testResults).length;
      console.log(`📊 Test Summary: ${successCount}/${totalTests} tests passed`);
      
    } catch (error) {
      console.error('❌ Database test error:', error);
      testResults.globalError = error;
      setResults(testResults);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (test: any) => {
    if (test.timedOut) return '⏱️';
    if (test.success) return '✅';
    if (test.error) return '❌';
    return '❓';
  };

  const getStatusText = (test: any) => {
    if (test.timedOut) return 'Timed Out';
    if (test.success) return 'Success';
    if (test.error) return 'Error';
    return 'Unknown';
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-white p-4 rounded-lg shadow-lg max-w-md max-h-96 overflow-auto border">
      <h3 className="font-bold mb-2 text-lg">Database Debug Panel</h3>
      
      <button
        onClick={testDatabase}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4 disabled:opacity-50 text-sm hover:bg-blue-600 w-full"
      >
        {loading ? 'Testing Database...' : 'Run Database Tests'}
      </button>

      {user && (
        <div className="text-xs mb-2 p-2 bg-green-50 rounded border">
          <strong>Current User:</strong> {user.id.slice(0, 8)}...
          <br />
          <strong>Email:</strong> {user.email}
        </div>
      )}

      {Object.keys(results).length > 0 && (
        <div className="space-y-2 text-xs">
          {Object.entries(results).map(([key, value]: [string, any]) => (
            <div key={key} className={`border p-2 rounded ${
              value.success ? 'border-green-200 bg-green-50' : 
              value.timedOut ? 'border-yellow-200 bg-yellow-50' :
              value.error ? 'border-red-200 bg-red-50' : 
              'border-gray-200'
            }`}>
              <div className="font-semibold text-sm flex items-center gap-2">
                <span>{getStatusIcon(value)}</span>
                <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
                <span className={`text-xs px-1 py-0.5 rounded ${
                  value.success ? 'bg-green-100 text-green-800' :
                  value.timedOut ? 'bg-yellow-100 text-yellow-800' :
                  value.error ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {getStatusText(value)}
                </span>
              </div>
              
              {value.error && (
                <div className="text-red-600 text-xs mt-1 p-1 bg-red-50 rounded">
                  <strong>Error:</strong> {value.error}
                </div>
              )}
              
              {value.timedOut && (
                <div className="text-yellow-600 text-xs mt-1 p-1 bg-yellow-50 rounded">
                  Operation timed out - possible connectivity issue
                </div>
              )}
              
              <div className="text-gray-600 mt-1">
                Count: {value.count || 0}
              </div>
              
              {value.data && value.data.length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-blue-600 text-xs hover:text-blue-800">
                    View Data ({value.data.length} items)
                  </summary>
                  <pre className="text-xs bg-gray-100 p-1 mt-1 rounded overflow-auto max-h-32 border">
                    {JSON.stringify(value.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-3 text-xs text-gray-500 border-t pt-2">
        <p>🔧 This panel tests database connectivity and query performance</p>
        <p>⏱️ All queries have 3-second timeouts</p>
      </div>
    </div>
  );
}; 
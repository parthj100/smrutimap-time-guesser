import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { queryWithTimeout, safeQuery, testDatabaseConnectivity } from '@/utils/databaseUtils';

export const TimeoutTestPanel: React.FC = () => {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runTimeoutTests = async () => {
    setLoading(true);
    const testResults: any = {};

    try {
      console.log('🧪 Running timeout protection tests...');

      // Test 1: Normal query with timeout
      console.log('Test 1: Normal query with timeout protection');
      const startTime = Date.now();
      
      const { data, error, timedOut } = await safeQuery(
        async () => {
          return await supabase
            .from('user_profiles' as any)
            .select('count', { count: 'exact', head: true });
        },
        { operation: 'Test normal query', timeoutMs: 2000 }
      );

      const endTime = Date.now();
      
      testResults.normalQuery = {
        success: !error && !timedOut,
        timedOut,
        error: error?.message,
        duration: endTime - startTime,
        data: data
      };

      // Test 2: Connectivity test
      console.log('Test 2: Database connectivity test');
      const connectivityStart = Date.now();
      const isConnected = await testDatabaseConnectivity();
      const connectivityEnd = Date.now();
      
      testResults.connectivity = {
        success: isConnected,
        duration: connectivityEnd - connectivityStart,
        connected: isConnected
      };

      // Test 3: Simulated slow query (this will timeout)
      console.log('Test 3: Simulated timeout scenario');
      const timeoutStart = Date.now();
      
      const { data: slowData, error: slowError, timedOut: slowTimedOut } = await safeQuery(
        async () => {
          // Simulate a slow query by adding a delay
          await new Promise(resolve => setTimeout(resolve, 4000));
          return await supabase
            .from('user_profiles' as any)
            .select('*')
            .limit(1);
        },
        { operation: 'Test timeout scenario', timeoutMs: 2000 }
      );

      const timeoutEnd = Date.now();
      
      testResults.timeoutTest = {
        success: false, // This should timeout
        timedOut: slowTimedOut,
        error: slowError?.message,
        duration: timeoutEnd - timeoutStart,
        expectedTimeout: true
      };

      // Test 4: Quick auth query
      console.log('Test 4: Auth query with timeout');
      const authStart = Date.now();
      
      try {
        const session = await queryWithTimeout(
          supabase.auth.getSession(),
          { operation: 'Test auth query', timeoutMs: 3000 }
        );
        const authEnd = Date.now();
        
        testResults.authQuery = {
          success: true,
          duration: authEnd - authStart,
          hasSession: !!session?.data?.session
        };
      } catch (authError: any) {
        const authEnd = Date.now();
        testResults.authQuery = {
          success: false,
          duration: authEnd - authStart,
          error: authError.message,
          timedOut: authError.message?.includes('timed out')
        };
      }

      setResults(testResults);
      console.log('✅ Timeout tests completed:', testResults);
      
    } catch (error) {
      console.error('❌ Timeout test error:', error);
      testResults.globalError = error;
      setResults(testResults);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (test: any) => {
    if (test.timedOut && test.expectedTimeout) return '✅'; // Expected timeout
    if (test.timedOut) return '⏱️'; // Unexpected timeout
    if (test.success) return '✅'; // Success
    if (test.error) return '❌'; // Error
    return '❓'; // Unknown
  };

  const getStatusText = (test: any) => {
    if (test.timedOut && test.expectedTimeout) return 'Timeout (Expected)';
    if (test.timedOut) return 'Timed Out';
    if (test.success) return 'Success';
    if (test.error) return 'Error';
    return 'Unknown';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white p-4 rounded-lg shadow-lg max-w-md max-h-96 overflow-auto border">
      <h3 className="font-bold mb-2 text-lg">Timeout Protection Tests</h3>
      
      <button
        onClick={runTimeoutTests}
        disabled={loading}
        className="bg-purple-500 text-white px-4 py-2 rounded mb-4 disabled:opacity-50 text-sm hover:bg-purple-600 w-full"
      >
        {loading ? 'Running Tests...' : 'Test Timeout Protection'}
      </button>

      {Object.keys(results).length > 0 && (
        <div className="space-y-2 text-xs">
          {Object.entries(results).map(([key, value]: [string, any]) => (
            <div key={key} className={`border p-2 rounded ${
              value.success || (value.timedOut && value.expectedTimeout) ? 'border-green-200 bg-green-50' : 
              value.timedOut ? 'border-yellow-200 bg-yellow-50' :
              value.error ? 'border-red-200 bg-red-50' : 
              'border-gray-200'
            }`}>
              <div className="font-semibold text-sm flex items-center gap-2">
                <span>{getStatusIcon(value)}</span>
                <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
                <span className={`text-xs px-1 py-0.5 rounded ${
                  value.success || (value.timedOut && value.expectedTimeout) ? 'bg-green-100 text-green-800' :
                  value.timedOut ? 'bg-yellow-100 text-yellow-800' :
                  value.error ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {getStatusText(value)}
                </span>
              </div>
              
              {value.error && !value.expectedTimeout && (
                <div className="text-red-600 text-xs mt-1 p-1 bg-red-50 rounded">
                  <strong>Error:</strong> {value.error}
                </div>
              )}
              
              {value.duration && (
                <div className="text-gray-600 text-xs mt-1">
                  Duration: {value.duration}ms
                </div>
              )}
              
              {value.expectedTimeout && value.timedOut && (
                <div className="text-green-600 text-xs mt-1 p-1 bg-green-50 rounded">
                  ✅ Timeout protection working correctly
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-3 text-xs text-gray-500 border-t pt-2">
        <p>🔧 Tests timeout protection functionality</p>
        <p>⏱️ Ensures queries don't hang indefinitely</p>
      </div>
    </div>
  );
}; 
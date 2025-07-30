import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Settings, 
  Shield, 
  Gamepad2, 
  Users, 
  Database,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { AdminService } from '@/services/adminService';

interface GameSettings {
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  maxPlayersPerRoom: number;
  defaultRounds: number;
  defaultTimePerRound: number;
  enableAnalytics: boolean;
  enableMultiplayer: boolean;
  enableLeaderboard: boolean;
}

interface SystemSettings {
  enableVisitorTracking: boolean;
  enableErrorLogging: boolean;
  enablePerformanceMonitoring: boolean;
}

interface AnalyticsSettings {
  retentionDays: number;
  enableGeolocation: boolean;
  enableReferrerTracking: boolean;
}

interface AdminSettings {
  game_settings: GameSettings;
  system_settings: SystemSettings;
  analytics_settings: AnalyticsSettings;
}

export const AdminSettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<AdminSettings>({
    game_settings: {
      maintenanceMode: false,
      allowNewRegistrations: true,
      maxPlayersPerRoom: 8,
      defaultRounds: 5,
      defaultTimePerRound: 60,
      enableAnalytics: true,
      enableMultiplayer: true,
      enableLeaderboard: true
    },
    system_settings: {
      enableVisitorTracking: true,
      enableErrorLogging: true,
      enablePerformanceMonitoring: true
    },
    analytics_settings: {
      retentionDays: 90,
      enableGeolocation: false,
      enableReferrerTracking: true
    }
  });

  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialSettings, setInitialSettings] = useState<AdminSettings | null>(null);

  // Load settings from database on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const dbSettings = await AdminService.getAdminSettings();
        if (Object.keys(dbSettings).length > 0) {
          setSettings(dbSettings as AdminSettings);
          setInitialSettings(dbSettings as AdminSettings);
        } else {
          setInitialSettings(settings);
        }
      } catch (error) {
        console.error('Error loading admin settings:', error);
        toast.error('Failed to load admin settings');
        setInitialSettings(settings);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Track changes
  useEffect(() => {
    if (initialSettings) {
      setHasChanges(JSON.stringify(settings) !== JSON.stringify(initialSettings));
    }
  }, [settings, initialSettings]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await AdminService.updateAdminSettings(settings);
      setInitialSettings(settings);
      toast.success('Settings saved successfully!');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save settings');
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    const defaultSettings: AdminSettings = {
      game_settings: {
        maintenanceMode: false,
        allowNewRegistrations: true,
        maxPlayersPerRoom: 8,
        defaultRounds: 5,
        defaultTimePerRound: 60,
        enableAnalytics: true,
        enableMultiplayer: true,
        enableLeaderboard: true
      },
      system_settings: {
        enableVisitorTracking: true,
        enableErrorLogging: true,
        enablePerformanceMonitoring: true
      },
      analytics_settings: {
        retentionDays: 90,
        enableGeolocation: false,
        enableReferrerTracking: true
      }
    };
    setSettings(defaultSettings);
    toast.success('Settings reset to defaults');
  };

  const handleDatabaseOperation = async (operation: string) => {
    setLoading(true);
    try {
      switch (operation) {
        case 'backup':
          toast.info('Database backup feature would be implemented here');
          break;
        case 'clean':
          toast.info('Data cleanup feature would be implemented here');
          break;
        case 'reset_stats':
          toast.info('Stats reset feature would be implemented here');
          break;
        case 'clear_sessions':
          toast.info('Session cleanup feature would be implemented here');
          break;
        default:
          toast.error('Unknown operation');
      }
    } catch (error) {
      toast.error(`Failed to perform ${operation}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Game Settings */}
      <Card className="bg-white shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            Game Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="maxPlayers">Max Players Per Room</Label>
              <Input
                id="maxPlayers"
                type="number"
                value={settings.game_settings.maxPlayersPerRoom}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  game_settings: { 
                    ...prev.game_settings, 
                    maxPlayersPerRoom: parseInt(e.target.value) || 8 
                  } 
                }))}
                min="2"
                max="20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultRounds">Default Rounds</Label>
              <Input
                id="defaultRounds"
                type="number"
                value={settings.game_settings.defaultRounds}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  game_settings: { 
                    ...prev.game_settings, 
                    defaultRounds: parseInt(e.target.value) || 5 
                  } 
                }))}
                min="1"
                max="20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timePerRound">Time Per Round (seconds)</Label>
              <Input
                id="timePerRound"
                type="number"
                value={settings.game_settings.defaultTimePerRound}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  game_settings: { 
                    ...prev.game_settings, 
                    defaultTimePerRound: parseInt(e.target.value) || 60 
                  } 
                }))}
                min="30"
                max="300"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card className="bg-white shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="maintenance">Maintenance Mode</Label>
                <p className="text-sm text-gray-600">
                  Temporarily disable the game for maintenance
                </p>
              </div>
              <Switch
                id="maintenance"
                checked={settings.game_settings.maintenanceMode}
                onCheckedChange={(checked) => setSettings(prev => ({ 
                  ...prev, 
                  game_settings: { 
                    ...prev.game_settings, 
                    maintenanceMode: checked 
                  } 
                }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="registrations">Allow New Registrations</Label>
                <p className="text-sm text-gray-600">
                  Enable or disable new user registrations
                </p>
              </div>
              <Switch
                id="registrations"
                checked={settings.game_settings.allowNewRegistrations}
                onCheckedChange={(checked) => setSettings(prev => ({ 
                  ...prev, 
                  game_settings: { 
                    ...prev.game_settings, 
                    allowNewRegistrations: checked 
                  } 
                }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="analytics">Enable Analytics</Label>
                <p className="text-sm text-gray-600">
                  Track visitor and user analytics
                </p>
              </div>
              <Switch
                id="analytics"
                checked={settings.game_settings.enableAnalytics}
                onCheckedChange={(checked) => setSettings(prev => ({ 
                  ...prev, 
                  game_settings: { 
                    ...prev.game_settings, 
                    enableAnalytics: checked 
                  } 
                }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="multiplayer">Enable Multiplayer</Label>
                <p className="text-sm text-gray-600">
                  Allow multiplayer game rooms
                </p>
              </div>
              <Switch
                id="multiplayer"
                checked={settings.game_settings.enableMultiplayer}
                onCheckedChange={(checked) => setSettings(prev => ({ 
                  ...prev, 
                  game_settings: { 
                    ...prev.game_settings, 
                    enableMultiplayer: checked 
                  } 
                }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="leaderboard">Enable Leaderboard</Label>
                <p className="text-sm text-gray-600">
                  Show global leaderboard to users
                </p>
              </div>
              <Switch
                id="leaderboard"
                checked={settings.game_settings.enableLeaderboard}
                onCheckedChange={(checked) => setSettings(prev => ({ 
                  ...prev, 
                  game_settings: { 
                    ...prev.game_settings, 
                    enableLeaderboard: checked 
                  } 
                }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Management */}
      <Card className="bg-white shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => handleDatabaseOperation('backup')}
              disabled={loading}
            >
              <Shield className="h-4 w-4 mr-2" />
              Backup Database
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => handleDatabaseOperation('clean')}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Clean Old Data
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => handleDatabaseOperation('reset_stats')}
              disabled={loading}
            >
              <Users className="h-4 w-4 mr-2" />
              Reset All Stats
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => handleDatabaseOperation('clear_sessions')}
              disabled={loading}
            >
              <Gamepad2 className="h-4 w-4 mr-2" />
              Clear Game Sessions
            </Button>
          </div>
          
          {/* Warning about database operations */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-800">
                Database operations are currently informational only. In a production environment, 
                these would perform actual database operations.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="bg-white shadow-lg border-0">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasChanges ? (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Settings Modified
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Settings Saved
                </Badge>
              )}
              <span className="text-sm text-gray-600">
                {hasChanges ? 'Click save to apply changes' : 'All changes saved'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleReset} variant="outline" disabled={loading}>
                Reset
              </Button>
              <Button onClick={handleSave} disabled={loading || !hasChanges}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 
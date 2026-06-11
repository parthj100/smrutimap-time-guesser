import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Settings,
  Gamepad2,
  Database,
  Save,
  Trash2,
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
  const [confirmClean, setConfirmClean] = useState(false);
  const [cleaning, setCleaning] = useState(false);

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

  const retentionDays = settings.analytics_settings.retentionDays || 90;

  const handleCleanAnalytics = async () => {
    setCleaning(true);
    try {
      const deleted = await AdminService.cleanOldAnalytics(retentionDays);
      toast.success(
        deleted > 0
          ? `Removed ${deleted.toLocaleString()} analytics ${deleted === 1 ? 'row' : 'rows'} older than ${retentionDays} days`
          : `No analytics rows older than ${retentionDays} days`
      );
      setConfirmClean(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Cleanup failed');
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Game Settings */}
      <Card className="bg-white shadow-sm border border-gray-200">
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
      <Card className="bg-white shadow-sm border border-gray-200">
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

      {/* Database Maintenance */}
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-brand" />
            Database Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Prune old analytics</p>
              <p className="text-sm text-gray-600">
                Permanently delete visitor-tracking rows older than{' '}
                <span className="font-semibold">{retentionDays} days</span>{' '}
                (set in Analytics retention). Game history and the leaderboard
                are never touched.
              </p>
            </div>
            <Button
              variant="outline"
              className="text-brand border-brand/30 hover:bg-brand/5 shrink-0"
              onClick={() => setConfirmClean(true)}
              disabled={cleaning}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {cleaning ? 'Cleaning…' : 'Clean now'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmClean} onOpenChange={(o) => !o && setConfirmClean(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Prune analytics older than {retentionDays} days?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes old visitor-tracking rows. It does not
              affect users, game sessions, or the leaderboard. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cleaning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCleanAnalytics();
              }}
              disabled={cleaning}
              className="bg-brand hover:bg-brand-dark"
            >
              {cleaning ? 'Cleaning…' : 'Delete old analytics'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Actions */}
      <Card className="bg-white shadow-sm border border-gray-200">
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
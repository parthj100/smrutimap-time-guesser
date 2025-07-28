import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Shield, 
  Gamepad2, 
  Users, 
  Database,
  Save,
  RefreshCw
} from 'lucide-react';

export const AdminSettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    allowNewRegistrations: true,
    maxPlayersPerRoom: 8,
    defaultRounds: 5,
    defaultTimePerRound: 60,
    enableAnalytics: true,
    enableMultiplayer: true,
    enableLeaderboard: true
  });

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    // TODO: Implement settings save
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const handleReset = () => {
    setSettings({
      maintenanceMode: false,
      allowNewRegistrations: true,
      maxPlayersPerRoom: 8,
      defaultRounds: 5,
      defaultTimePerRound: 60,
      enableAnalytics: true,
      enableMultiplayer: true,
      enableLeaderboard: true
    });
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
                value={settings.maxPlayersPerRoom}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  maxPlayersPerRoom: parseInt(e.target.value) || 8 
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
                value={settings.defaultRounds}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  defaultRounds: parseInt(e.target.value) || 5 
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
                value={settings.defaultTimePerRound}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  defaultTimePerRound: parseInt(e.target.value) || 60 
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
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => setSettings(prev => ({ 
                  ...prev, 
                  maintenanceMode: checked 
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
                checked={settings.allowNewRegistrations}
                onCheckedChange={(checked) => setSettings(prev => ({ 
                  ...prev, 
                  allowNewRegistrations: checked 
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
                checked={settings.enableAnalytics}
                onCheckedChange={(checked) => setSettings(prev => ({ 
                  ...prev, 
                  enableAnalytics: checked 
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
                checked={settings.enableMultiplayer}
                onCheckedChange={(checked) => setSettings(prev => ({ 
                  ...prev, 
                  enableMultiplayer: checked 
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
                checked={settings.enableLeaderboard}
                onCheckedChange={(checked) => setSettings(prev => ({ 
                  ...prev, 
                  enableLeaderboard: checked 
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
            <Button variant="outline" className="justify-start">
              <Shield className="h-4 w-4 mr-2" />
              Backup Database
            </Button>
            <Button variant="outline" className="justify-start">
              <RefreshCw className="h-4 w-4 mr-2" />
              Clean Old Data
            </Button>
            <Button variant="outline" className="justify-start">
              <Users className="h-4 w-4 mr-2" />
              Reset All Stats
            </Button>
            <Button variant="outline" className="justify-start">
              <Gamepad2 className="h-4 w-4 mr-2" />
              Clear Game Sessions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="bg-white shadow-lg border-0">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Settings Modified
              </Badge>
              <span className="text-sm text-gray-600">
                Click save to apply changes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleReset} variant="outline">
                Reset
              </Button>
              <Button onClick={handleSave} disabled={loading}>
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
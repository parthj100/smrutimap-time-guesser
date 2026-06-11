import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { toast } from 'sonner';
import {
  Search,
  Users,
  Crown,
  Ban,
  RotateCcw,
  RefreshCw,
  MoreHorizontal,
  ShieldCheck,
} from 'lucide-react';
import { AdminService } from '@/services/adminService';
import type { AdminUserStats } from '@/types/admin';

const formatLastActive = (iso: string): string => {
  if (!iso) return 'Unknown';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return 'Unknown';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

type PendingAction =
  | { kind: 'reset'; user: AdminUserStats }
  | { kind: 'ban'; user: AdminUserStats }
  | { kind: 'unban'; user: AdminUserStats };

export const AdminUsersPanel: React.FC = () => {
  const [users, setUsers] = useState<AdminUserStats[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [working, setWorking] = useState(false);

  const loadUsers = useCallback(async (search: string) => {
    try {
      setLoading(true);
      setError(null);
      const { total: t, users: u } = await AdminService.getUsers(search, 100, 0);
      setUsers(u);
      setTotal(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced server-side search.
  useEffect(() => {
    const t = window.setTimeout(() => loadUsers(searchTerm), 300);
    return () => window.clearTimeout(t);
  }, [searchTerm, loadUsers]);

  const runAction = async () => {
    if (!pending) return;
    setWorking(true);
    try {
      if (pending.kind === 'reset') {
        await AdminService.resetUserStats(pending.user.userId);
        toast.success(`Reset stats for ${pending.user.displayName}`);
      } else {
        const banned = pending.kind === 'ban';
        await AdminService.setUserBan(pending.user.userId, banned);
        toast.success(
          `${banned ? 'Banned' : 'Unbanned'} ${pending.user.displayName}`
        );
      }
      setPending(null);
      await loadUsers(searchTerm);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setWorking(false);
    }
  };

  const dialogCopy = (() => {
    if (!pending) return null;
    const name = pending.user.displayName;
    if (pending.kind === 'reset')
      return {
        title: `Reset ${name}'s stats?`,
        body: 'Their score, games played, average, and best game will all be set to zero. This cannot be undone.',
        action: 'Reset stats',
      };
    if (pending.kind === 'ban')
      return {
        title: `Ban ${name}?`,
        body: 'They will be blocked from accessing their account data until unbanned.',
        action: 'Ban user',
      };
    return {
      title: `Unban ${name}?`,
      body: 'They will regain normal access to the game.',
      action: 'Unban user',
    };
  })();

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand" />
            User Management
            <span className="text-sm font-normal text-gray-500">
              ({total} total)
            </span>
          </CardTitle>
          <Button
            onClick={() => loadUsers(searchTerm)}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by username or display name…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-brand font-medium mb-3">{error}</p>
            <Button onClick={() => loadUsers(searchTerm)} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm
                ? 'No users match your search.'
                : 'No users yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.userId}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 ${
                      user.banned ? 'bg-gray-400' : 'bg-brand'
                    }`}
                  >
                    {(user.displayName?.[0] || user.username[0]).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {user.displayName || user.username}
                      </h3>
                      {user.isAdmin && (
                        <Badge className="bg-brand/10 text-brand hover:bg-brand/10">
                          <Crown className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      {user.banned && (
                        <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100">
                          <Ban className="h-3 w-3 mr-1" />
                          Banned
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">@{user.username}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                      <span>{user.gamesPlayed} games</span>
                      <span>•</span>
                      <span>{user.totalScore.toLocaleString()} pts</span>
                      <span>•</span>
                      <span>avg {user.averageScore.toLocaleString()}</span>
                      <span>•</span>
                      <span>active {formatLastActive(user.lastActive)}</span>
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" aria-label="User actions">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setPending({ kind: 'reset', user });
                      }}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset stats
                    </DropdownMenuItem>
                    {user.banned ? (
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setPending({ kind: 'unban', user });
                        }}
                      >
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Unban user
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        disabled={user.isAdmin}
                        onSelect={(e) => {
                          e.preventDefault();
                          setPending({ kind: 'ban', user });
                        }}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Ban user
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogCopy?.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogCopy?.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                runAction();
              }}
              disabled={working}
              className={
                pending?.kind === 'ban' || pending?.kind === 'reset'
                  ? 'bg-brand hover:bg-brand-dark'
                  : undefined
              }
            >
              {working ? 'Working…' : dialogCopy?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

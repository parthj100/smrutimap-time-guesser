import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { MessageSquare, RefreshCw, Mail, ExternalLink } from 'lucide-react';
import { AdminService } from '@/services/adminService';
import type { AdminFeedbackItem, FeedbackStatus } from '@/types/admin';

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  open: 'bg-brand/10 text-brand',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-gray-200 text-gray-600',
};

const CATEGORY_STYLES: Record<string, string> = {
  bug: 'bg-red-100 text-red-700',
  feature: 'bg-blue-100 text-blue-700',
  ui: 'bg-purple-100 text-purple-700',
  performance: 'bg-orange-100 text-orange-700',
  content: 'bg-teal-100 text-teal-700',
  general: 'bg-gray-100 text-gray-700',
};

const STATUS_OPTIONS: FeedbackStatus[] = [
  'open',
  'in_progress',
  'resolved',
  'closed',
];

export const AdminFeedbackPanel: React.FC = () => {
  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | FeedbackStatus>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setItems(await AdminService.getFeedback(200));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (item: AdminFeedbackItem, status: FeedbackStatus) => {
    setUpdatingId(item.id);
    // Optimistic update.
    setItems((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, status } : f))
    );
    try {
      await AdminService.setFeedbackStatus(item.id, status);
      toast.success(`Marked “${item.category}” as ${status.replace('_', ' ')}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update status');
      await load();
    } finally {
      setUpdatingId(null);
    }
  };

  const visible =
    filter === 'all' ? items : items.filter((i) => i.status === filter);
  const openCount = items.filter((i) => i.status === 'open').length;

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-brand" />
            User Feedback
            <span className="text-sm font-normal text-gray-500">
              ({items.length} total{openCount > 0 ? `, ${openCount} open` : ''})
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as 'all' | FeedbackStatus)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={load} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-brand font-medium mb-3">{error}</p>
            <Button onClick={load} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-10">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {filter === 'all'
                ? 'No feedback has been submitted yet.'
                : `No ${filter.replace('_', ' ')} feedback.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      className={`${CATEGORY_STYLES[item.category] || CATEGORY_STYLES.general} hover:opacity-100 capitalize`}
                    >
                      {item.category}
                    </Badge>
                    <Badge className={`${STATUS_STYLES[item.status]} capitalize`}>
                      {item.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                  <Select
                    value={item.status}
                    onValueChange={(v) => updateStatus(item, v as FeedbackStatus)}
                    disabled={updatingId === item.id}
                  >
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-sm text-gray-800 mt-3 whitespace-pre-wrap break-words">
                  {item.message}
                </p>

                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 flex-wrap">
                  {item.email && (
                    <a
                      href={`mailto:${item.email}`}
                      className="inline-flex items-center gap-1 hover:text-brand"
                    >
                      <Mail className="h-3 w-3" />
                      {item.email}
                    </a>
                  )}
                  {item.page_url && (
                    <span className="inline-flex items-center gap-1 truncate max-w-[16rem]">
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      {item.page_url}
                    </span>
                  )}
                  <span>{item.user_id ? 'Registered user' : 'Anonymous'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

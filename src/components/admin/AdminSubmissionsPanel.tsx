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
import { Image as ImageIcon, RefreshCw, MapPin, Calendar } from 'lucide-react';
import { AdminService } from '@/services/adminService';
import AdminSubmissionReviewDialog from './AdminSubmissionReviewDialog';
import type {
  AdminPhotoSubmission,
  PhotoSubmissionStatus,
} from '@/types/admin';

const STATUS_STYLES: Record<PhotoSubmissionStatus, string> = {
  pending: 'bg-brand/10 text-brand',
  reviewing: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-gray-200 text-gray-600',
  needs_info: 'bg-blue-100 text-blue-700',
};

const FILTERS: Array<'all' | PhotoSubmissionStatus> = [
  'all',
  'pending',
  'reviewing',
  'approved',
  'rejected',
  'needs_info',
];

export const AdminSubmissionsPanel: React.FC = () => {
  const [items, setItems] = useState<AdminPhotoSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | PhotoSubmissionStatus>('all');
  const [active, setActive] = useState<AdminPhotoSubmission | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setItems(await AdminService.getPhotoSubmissions(200));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const review = (s: AdminPhotoSubmission) => {
    setActive(s);
    setDialogOpen(true);
  };

  const visible =
    filter === 'all' ? items : items.filter((i) => i.status === filter);
  const pendingCount = items.filter(
    (i) => i.status === 'pending' || i.status === 'reviewing'
  ).length;

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-brand" />
            Photo Submissions
            <span className="text-sm font-normal text-gray-500">
              ({items.length} total
              {pendingCount > 0 ? `, ${pendingCount} to review` : ''})
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as 'all' | PhotoSubmissionStatus)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTERS.map((f) => (
                  <SelectItem key={f} value={f} className="capitalize">
                    {f === 'all' ? 'All statuses' : f.replace('_', ' ')}
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
          <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-100 rounded-lg" />
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
            <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {filter === 'all'
                ? 'No photo submissions yet.'
                : `No ${filter.replace('_', ' ')} submissions.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visible.map((s) => {
              const actionable = s.status !== 'approved' && s.status !== 'rejected';
              return (
                <div
                  key={s.id}
                  className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div className="w-24 h-24 rounded-md overflow-hidden bg-gray-200 shrink-0">
                    <img
                      src={s.photo_url}
                      alt="Submission"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${STATUS_STYLES[s.status]} capitalize`}>
                        {s.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-gray-500 truncate">
                        {s.submitter_name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {(s.location_description || '—').split('\n')[0]}
                    </p>
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <Calendar className="h-3 w-3 shrink-0" />
                      {s.year_taken ?? '—'}
                    </p>
                    <div className="mt-auto pt-2">
                      <Button
                        size="sm"
                        variant={actionable ? 'default' : 'outline'}
                        className={
                          actionable
                            ? 'bg-brand hover:bg-brand-dark h-8'
                            : 'h-8'
                        }
                        onClick={() => review(s)}
                      >
                        {actionable ? 'Review' : 'View'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <AdminSubmissionReviewDialog
        submission={active}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onDone={load}
      />
    </Card>
  );
};

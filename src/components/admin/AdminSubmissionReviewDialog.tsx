import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import MapSelector from '@/components/MapSelector';
import { toast } from 'sonner';
import { MapPin, Calendar, User, Check, X } from 'lucide-react';
import { AdminService } from '@/services/adminService';
import { GAME_CONSTANTS } from '@/constants/gameConstants';
import type { AdminPhotoSubmission } from '@/types/admin';

interface Props {
  submission: AdminPhotoSubmission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

/** Full review modal: read the photo + clues, drop a pin to set coordinates,
 *  confirm year/name/description, then approve (publishes a game_images row)
 *  or reject with a reason. */
const AdminSubmissionReviewDialog: React.FC<Props> = ({
  submission,
  open,
  onOpenChange,
  onDone,
}) => {
  const [locationName, setLocationName] = useState('');
  const [year, setYear] = useState<number>(GAME_CONSTANTS.YEAR_RANGE.DEFAULT);
  const [description, setDescription] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [working, setWorking] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Seed the form from the submission each time a new one opens.
  useEffect(() => {
    if (!submission) return;
    const firstLine = (submission.location_description || '').split('\n')[0].trim();
    setLocationName(firstLine);
    setYear(submission.year_taken ?? GAME_CONSTANTS.YEAR_RANGE.DEFAULT);
    setDescription(submission.description || submission.clues_description || '');
    setCoords(null);
    setRejecting(false);
    setRejectReason('');
  }, [submission]);

  if (!submission) return null;

  const handleApprove = async () => {
    if (!coords) {
      toast.error('Click the map to set the location first');
      return;
    }
    setWorking(true);
    try {
      await AdminService.approvePhotoSubmission(submission.id, {
        imageUrl: submission.photo_url,
        year,
        lat: coords.lat,
        lng: coords.lng,
        locationName,
        description,
      });
      toast.success('Approved and added to the game pool');
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not approve');
    } finally {
      setWorking(false);
    }
  };

  const handleReject = async () => {
    setWorking(true);
    try {
      await AdminService.setPhotoSubmissionStatus(submission.id, 'rejected', {
        rejectionReason: rejectReason,
      });
      toast.success('Submission rejected');
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reject');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review submission</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Photo + submitter context */}
          <div className="space-y-3">
            <div className="rounded-lg overflow-hidden bg-gray-100 aspect-[4/3] flex items-center justify-center">
              <img
                src={submission.photo_url}
                alt="Submitted photo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-sm space-y-1.5 text-gray-700">
              <p className="flex items-center gap-2">
                <User className="h-4 w-4 text-brand shrink-0" />
                {submission.submitter_name}
                {submission.email && (
                  <span className="text-gray-400">· {submission.email}</span>
                )}
              </p>
              <p className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                <span className="whitespace-pre-wrap">
                  {submission.location_description || '—'}
                </span>
              </p>
              <p className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-brand shrink-0" />
                {submission.year_taken ?? '—'}
                {submission.year_confidence && (
                  <span className="text-gray-400">
                    ({submission.year_confidence})
                  </span>
                )}
              </p>
              {submission.clues_description && (
                <p className="text-gray-500">
                  <span className="font-medium">Clues:</span>{' '}
                  {submission.clues_description}
                </p>
              )}
            </div>
          </div>

          {/* Editable game-image fields */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="loc-name">Location name (shown in results)</Label>
              <Input
                id="loc-name"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Edison, NJ"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc-year">Year</Label>
              <Input
                id="loc-year"
                type="number"
                value={year}
                min={GAME_CONSTANTS.YEAR_RANGE.MIN}
                max={GAME_CONSTANTS.YEAR_RANGE.MAX}
                onChange={(e) =>
                  setYear(parseInt(e.target.value) || GAME_CONSTANTS.YEAR_RANGE.DEFAULT)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc-desc">Description</Label>
              <Textarea
                id="loc-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Pin the exact location{' '}
                {coords ? (
                  <span className="text-emerald-600 font-medium">
                    ({coords.lat.toFixed(3)}, {coords.lng.toFixed(3)})
                  </span>
                ) : (
                  <span className="text-brand">— click the map</span>
                )}
              </Label>
              <div className="h-56 rounded-lg overflow-hidden">
                <MapSelector
                  onLocationSelected={(lat, lng) => setCoords({ lat, lng })}
                  guessedLocation={coords}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {rejecting ? (
          <div className="space-y-3 border-t pt-4">
            <Label htmlFor="reject-reason">Reason for rejection (optional)</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={2}
              placeholder="Shared with no one — for your records"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRejecting(false)}
                disabled={working}
              >
                Back
              </Button>
              <Button
                onClick={handleReject}
                disabled={working}
                className="bg-brand hover:bg-brand-dark"
              >
                {working ? 'Rejecting…' : 'Confirm rejection'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center border-t pt-4">
            <Button
              variant="outline"
              className="text-brand border-brand/30 hover:bg-brand/5"
              onClick={() => setRejecting(true)}
              disabled={working}
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={working || !coords}
              className="bg-brand hover:bg-brand-dark"
            >
              <Check className="h-4 w-4 mr-2" />
              {working ? 'Approving…' : 'Approve & add to game'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdminSubmissionReviewDialog;

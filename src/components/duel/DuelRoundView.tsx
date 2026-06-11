import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle2, Eye, Hourglass, Zap } from 'lucide-react';
import GameImage from '@/components/GameImage';
import MapSelector from '@/components/MapSelector';
import YearSelector from '@/components/YearSelector';
import DuelHud from './DuelHud';
import { GAME_CONSTANTS } from '@/constants/gameConstants';
import type { DuelRoundImage } from '@/services/duelService';
import type { DuelPlayer, DuelRoundInfo, DuelGuess } from '@/types/duel';

interface DuelRoundViewProps {
  players: DuelPlayer[];
  myId: string | null;
  maxHp: number;
  round: DuelRoundInfo;
  image: DuelRoundImage | null;
  myGuess: DuelGuess | null;
  iHaveGuessed: boolean;
  opponentHasGuessed: boolean;
  guessWindowArmed: boolean;
  remainingMs: number | null;
  submitting: boolean;
  onlinePlayerIds: Set<string>;
  spectatorCount: number;
  onSubmit: (year: number, lat: number, lng: number) => Promise<void>;
}

const DuelRoundView: React.FC<DuelRoundViewProps> = ({
  players,
  myId,
  maxHp,
  round,
  image,
  myGuess,
  iHaveGuessed,
  opponentHasGuessed,
  guessWindowArmed,
  remainingMs,
  submitting,
  onlinePlayerIds,
  spectatorCount,
  onSubmit,
}) => {
  const isSpectator = !myId;
  const [year, setYear] = useState<number>(GAME_CONSTANTS.YEAR_RANGE.DEFAULT);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Reset the local guess at the start of each round.
  useEffect(() => {
    setYear(GAME_CONSTANTS.YEAR_RANGE.DEFAULT);
    setLocation(null);
  }, [round.id]);

  const lockedLocation =
    myGuess?.guessed_lat != null && myGuess?.guessed_lng != null
      ? { lat: myGuess.guessed_lat, lng: myGuess.guessed_lng }
      : location;

  const urgent = guessWindowArmed || (remainingMs != null && remainingMs <= 15000);

  const handleSubmit = async () => {
    if (!location || iHaveGuessed || isSpectator) return;
    try {
      await onSubmit(year, location.lat, location.lng);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not submit your guess');
    }
  };

  const statusPill = isSpectator ? (
    <span className="inline-flex items-center gap-2 bg-gray-900/85 text-white px-4 py-2 rounded-full text-sm font-medium">
      <Eye size={14} />
      Spectating · {round.guessed_player_ids.length}/2 guesses in
    </span>
  ) : iHaveGuessed ? (
    <span className="inline-flex items-center gap-2 bg-emerald-600/95 text-white px-4 py-2 rounded-full text-sm font-medium">
      <CheckCircle2 size={14} />
      Guess locked in — waiting for opponent
    </span>
  ) : guessWindowArmed ? (
    <span className="inline-flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse">
      <Zap size={14} />
      Opponent has guessed — hurry!
    </span>
  ) : opponentHasGuessed ? (
    <span className="inline-flex items-center gap-2 bg-amber-500/95 text-white px-4 py-2 rounded-full text-sm font-medium">
      <Hourglass size={14} />
      Opponent has guessed
    </span>
  ) : null;

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-cream overflow-x-hidden">
      <DuelHud
        players={players}
        myId={myId}
        maxHp={maxHp}
        roundNumber={round.round_number}
        multiplier={Number(round.multiplier)}
        remainingMs={remainingMs}
        urgent={urgent}
        onlinePlayerIds={onlinePlayerIds}
        spectatorCount={spectatorCount}
      />

      {statusPill && (
        <div className="flex justify-center mt-3 px-3 z-10">{statusPill}</div>
      )}

      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:overflow-hidden">
        {/* Photo */}
        <div className="min-h-[40vh] lg:min-h-0 lg:h-full rounded-2xl overflow-hidden bg-gray-900/5">
          {image ? (
            <GameImage imageUrl={image.image_url} />
          ) : (
            <div className="w-full h-full min-h-[40vh] flex items-center justify-center text-gray-400">
              Loading photo…
            </div>
          )}
        </div>

        {/* Guess controls */}
        <div className="flex flex-col gap-3 lg:h-full lg:overflow-hidden">
          <div className="h-[45vh] lg:h-auto lg:flex-1 lg:min-h-0">
            <MapSelector
              onLocationSelected={(lat, lng) => setLocation({ lat, lng })}
              isDisabled={iHaveGuessed || isSpectator || submitting}
              guessedLocation={lockedLocation}
            />
          </div>

          {!isSpectator && (
            <>
              <YearSelector
                onYearSelected={setYear}
                isDisabled={iHaveGuessed || submitting}
              />
              <Button
                onClick={handleSubmit}
                disabled={!location || iHaveGuessed || submitting}
                className="w-full h-14 text-lg font-bold bg-brand hover:bg-brand-dark text-white rounded-2xl shadow-lg transition-all disabled:opacity-50"
              >
                {iHaveGuessed
                  ? 'Locked in ✓'
                  : submitting
                    ? 'Submitting…'
                    : location
                      ? 'Lock in guess'
                      : 'Pick a location on the map'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DuelRoundView;

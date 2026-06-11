import React from 'react';
import { Eye } from 'lucide-react';
import DuelHealthBar from './DuelHealthBar';
import type { DuelPlayer } from '@/types/duel';

interface DuelHudProps {
  players: DuelPlayer[];
  myId: string | null;
  maxHp: number;
  roundNumber: number;
  multiplier: number;
  remainingMs: number | null;
  urgent?: boolean;
  onlinePlayerIds: Set<string>;
  spectatorCount: number;
}

export const formatCountdown = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

/** Top bar of a duel: my HP on the left, opponent's on the right, round
 *  number / damage multiplier / countdown in the middle. Spectators see the
 *  players in join order. */
const DuelHud: React.FC<DuelHudProps> = ({
  players,
  myId,
  maxHp,
  roundNumber,
  multiplier,
  remainingMs,
  urgent = false,
  onlinePlayerIds,
  spectatorCount,
}) => {
  const left = myId ? players.find((p) => p.id === myId) : players[0];
  const right = players.find((p) => p.id !== left?.id);

  return (
    <div className="w-full bg-white/95 backdrop-blur border-b border-gray-200 px-3 sm:px-6 py-3">
      <div className="max-w-6xl mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
        {left ? (
          <DuelHealthBar
            player={left}
            maxHp={maxHp}
            isMe={left.id === myId}
            online={onlinePlayerIds.has(left.id)}
            align="left"
          />
        ) : (
          <div />
        )}

        <div className="flex flex-col items-center px-1 sm:px-4">
          <div className="flex items-center gap-2 text-gray-900">
            <span className="font-space font-bold whitespace-nowrap">
              Round {roundNumber}
            </span>
            {multiplier > 1 && (
              <span className="bg-brand text-white text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                DMG ×{multiplier}
              </span>
            )}
          </div>
          {remainingMs != null && (
            <div
              role="timer"
              aria-live={urgent ? 'assertive' : 'off'}
              className={`font-space font-bold tabular-nums text-2xl leading-tight ${
                urgent ? 'text-brand animate-pulse' : 'text-gray-900'
              }`}
            >
              {formatCountdown(remainingMs)}
            </div>
          )}
          {spectatorCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Eye size={12} />
              {spectatorCount} watching
            </div>
          )}
        </div>

        {right ? (
          <DuelHealthBar
            player={right}
            maxHp={maxHp}
            isMe={right.id === myId}
            online={onlinePlayerIds.has(right.id)}
            align="right"
          />
        ) : (
          <div />
        )}
      </div>
    </div>
  );
};

export default DuelHud;

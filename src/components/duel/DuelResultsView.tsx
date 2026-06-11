import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Swords } from 'lucide-react';
import DuelHud from './DuelHud';
import DuelResultsMap from './DuelResultsMap';
import { formatCountdown } from './DuelHud';
import type { DuelPlayer, DuelRoundResults } from '@/types/duel';

export const PLAYER_PIN_COLORS = ['#3b82f6', '#f59e0b'];

interface DuelResultsViewProps {
  players: DuelPlayer[];
  myId: string | null;
  maxHp: number;
  results: DuelRoundResults;
  resultsRemainingMs: number | null;
  onlinePlayerIds: Set<string>;
  spectatorCount: number;
}

/** Orders guesses so "me" is first for players; join order for spectators. */
const orderGuesses = (results: DuelRoundResults, myId: string | null) => {
  const guesses = [...results.guesses];
  if (myId) {
    guesses.sort((a, b) =>
      a.player_id === myId ? -1 : b.player_id === myId ? 1 : 0
    );
  }
  return guesses;
};

const DuelResultsView: React.FC<DuelResultsViewProps> = ({
  players,
  myId,
  maxHp,
  results,
  resultsRemainingMs,
  onlinePlayerIds,
  spectatorCount,
}) => {
  const guesses = orderGuesses(results, myId);
  const winner = players.find((p) => p.id === results.winner_player_id);
  const loser = players.find(
    (p) => results.winner_player_id && p.id !== results.winner_player_id
  );
  const isTie = !results.winner_player_id;

  const pins = guesses
    .filter((g) => g.guessed_lat != null && g.guessed_lng != null)
    .map((g, i) => ({
      lat: g.guessed_lat as number,
      lng: g.guessed_lng as number,
      color: PLAYER_PIN_COLORS[i % PLAYER_PIN_COLORS.length],
      label: g.display_name,
    }));

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-cream overflow-x-hidden">
      <DuelHud
        players={players}
        myId={myId}
        maxHp={maxHp}
        roundNumber={results.round_number}
        multiplier={Number(results.multiplier)}
        remainingMs={null}
        onlinePlayerIds={onlinePlayerIds}
        spectatorCount={spectatorCount}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 lg:overflow-hidden">
        <div className="lg:col-span-3 h-[45vh] lg:h-full">
          <DuelResultsMap
            actual={{ lat: results.actual.lat, lng: results.actual.lng }}
            pins={pins}
          />
        </div>

        <div className="lg:col-span-2 flex flex-col gap-3 lg:overflow-y-auto">
          {/* The answer */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
            <div className="flex items-center gap-2 text-brand font-semibold">
              <MapPin size={16} />
              {results.actual.location_name}
              <span className="ml-auto font-space text-gray-900">
                {results.actual.year}
              </span>
            </div>
            {results.actual.description && (
              <p className="text-sm text-gray-600 mt-2">
                {results.actual.description}
              </p>
            )}
          </div>

          {/* Per-player breakdown */}
          {guesses.map((g, i) => {
            const won = g.player_id === results.winner_player_id;
            return (
              <motion.div
                key={g.player_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className={`bg-white rounded-2xl border-2 p-4 ${
                  won ? 'border-emerald-400' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        PLAYER_PIN_COLORS[i % PLAYER_PIN_COLORS.length],
                    }}
                  />
                  <span className="font-semibold text-gray-900">
                    {g.display_name}
                    {g.player_id === myId && (
                      <span className="text-gray-400 font-normal"> (you)</span>
                    )}
                  </span>
                  {won && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">
                      ROUND WINNER
                    </span>
                  )}
                  <span className="ml-auto font-space text-2xl font-bold text-gray-900 tabular-nums">
                    {g.total_score.toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                  {g.is_timeout ? (
                    <span className="text-brand font-medium">
                      Ran out of time — no guess
                    </span>
                  ) : (
                    <>
                      <span>
                        Year: <span className="font-space">{g.guessed_year}</span>{' '}
                        (+{g.year_score.toLocaleString()})
                      </span>
                      <span>
                        Location:{' '}
                        {g.distance_km != null
                          ? `${Math.round(g.distance_km).toLocaleString()} km off`
                          : '—'}{' '}
                        (+{g.location_score.toLocaleString()})
                      </span>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Damage banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45, type: 'spring', stiffness: 200 }}
            className={`rounded-2xl p-4 text-center text-white ${
              isTie ? 'bg-gray-500' : 'bg-brand'
            }`}
          >
            {isTie ? (
              <p className="font-bold text-lg">Tie round — no damage dealt</p>
            ) : (
              <>
                <p className="flex items-center justify-center gap-2 font-bold text-lg">
                  <Swords size={18} />
                  {loser?.display_name} takes{' '}
                  {(results.damage ?? 0).toLocaleString()} damage
                </p>
                <p className="text-white/85 text-sm mt-1">
                  {(results.score_diff ?? 0).toLocaleString()} score difference ×{' '}
                  {Number(results.multiplier)} multiplier
                  {winner ? ` — ${winner.display_name} wins the round` : ''}
                </p>
              </>
            )}
          </motion.div>

          {resultsRemainingMs != null && (
            <p className="text-center text-gray-600 font-medium pb-2">
              Next round in{' '}
              <span className="font-space font-bold">
                {formatCountdown(resultsRemainingMs)}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DuelResultsView;

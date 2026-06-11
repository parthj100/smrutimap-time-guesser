import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Home, RotateCcw, Trophy } from 'lucide-react';
import DuelHealthBar from './DuelHealthBar';
import DuelResultsMap from './DuelResultsMap';
import { PLAYER_PIN_COLORS } from './DuelResultsView';
import type {
  DuelInfo,
  DuelPlayer,
  DuelRoundResults,
  DuelRoundSummary,
} from '@/types/duel';

interface DuelGameOverViewProps {
  duel: DuelInfo;
  players: DuelPlayer[];
  myId: string | null;
  summary: DuelRoundSummary[] | null;
  finalRound: DuelRoundResults | null;
  onlinePlayerIds: Set<string>;
  onPlayAgain: () => void;
  onHome: () => void;
}

const reasonText: Record<string, string> = {
  knockout: 'by knockout',
  forfeit: 'by forfeit',
  draw: '— a perfect draw',
  exhausted: '— ran out of photos!',
  abandoned: '— match abandoned',
};

const DuelGameOverView: React.FC<DuelGameOverViewProps> = ({
  duel,
  players,
  myId,
  summary,
  finalRound,
  onlinePlayerIds,
  onPlayAgain,
  onHome,
}) => {
  const winner = players.find((p) => p.id === duel.winner_player_id) ?? null;
  const cancelled = duel.status === 'cancelled';
  const iWon = !!myId && winner?.id === myId;
  const iLost = !!myId && !!winner && winner.id !== myId;

  const headline = cancelled
    ? 'Duel cancelled'
    : iWon
      ? 'Victory! 🏆'
      : iLost
        ? 'Defeat'
        : winner
          ? `${winner.display_name} wins!`
          : 'Draw!';

  const sub = cancelled
    ? 'The host closed this lobby.'
    : winner
      ? `${winner.display_name} wins ${reasonText[duel.finish_reason ?? ''] ?? ''}`
      : duel.finish_reason
        ? `Match ended ${reasonText[duel.finish_reason] ?? ''}`
        : '';

  // Order columns: me first when I played, else join order.
  const ordered = myId
    ? [...players].sort((a, b) => (a.id === myId ? -1 : b.id === myId ? 1 : 0))
    : players;

  const finalPins =
    finalRound?.guesses
      .filter((g) => g.guessed_lat != null && g.guessed_lng != null)
      .map((g, i) => ({
        lat: g.guessed_lat as number,
        lng: g.guessed_lng as number,
        color: PLAYER_PIN_COLORS[i % PLAYER_PIN_COLORS.length],
        label: g.display_name,
      })) ?? [];

  return (
    <div className="min-h-screen bg-cream py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="text-center space-y-3"
        >
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
              iLost || cancelled ? 'bg-gray-400' : 'bg-brand'
            }`}
          >
            <Trophy size={40} className="text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-space text-gray-900">
            {headline}
          </h1>
          {sub && <p className="text-lg text-gray-600">{sub}</p>}
        </motion.div>

        {/* Final HP */}
        {players.length > 0 && (
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 space-y-5">
            {ordered.map((p) => (
              <DuelHealthBar
                key={p.id}
                player={p}
                maxHp={duel.starting_hp}
                isMe={p.id === myId}
                online={onlinePlayerIds.has(p.id)}
              />
            ))}
          </div>
        )}

        {/* Final round map */}
        {finalRound && finalPins.length > 0 && (
          <div className="h-[40vh]">
            <DuelResultsMap
              actual={{ lat: finalRound.actual.lat, lng: finalRound.actual.lng }}
              pins={finalPins}
            />
          </div>
        )}

        {/* Round-by-round breakdown */}
        {summary && summary.length > 0 && (
          <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-left px-4 py-3 font-semibold">Round</th>
                  {ordered.map((p) => (
                    <th key={p.id} className="text-right px-4 py-3 font-semibold">
                      {p.display_name}
                      {p.id === myId ? ' (you)' : ''}
                    </th>
                  ))}
                  <th className="text-right px-4 py-3 font-semibold">Damage</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((r) => {
                  const byPlayer = new Map(
                    r.guesses?.map((g) => [g.player_id, g]) ?? []
                  );
                  return (
                    <tr key={r.round_number} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-gray-700">
                        #{r.round_number}
                        {Number(r.multiplier) > 1 && (
                          <span className="ml-2 text-xs font-bold text-brand">
                            ×{Number(r.multiplier)}
                          </span>
                        )}
                      </td>
                      {ordered.map((p) => {
                        const g = byPlayer.get(p.id);
                        const won = r.winner_player_id === p.id;
                        return (
                          <td
                            key={p.id}
                            className={`px-4 py-3 text-right font-space tabular-nums ${
                              won ? 'text-emerald-600 font-bold' : 'text-gray-900'
                            }`}
                          >
                            {g ? g.total_score.toLocaleString() : '—'}
                            {g?.is_timeout ? ' ⏰' : ''}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right font-space tabular-nums text-brand font-semibold">
                        {r.damage ? `−${r.damage.toLocaleString()}` : '0'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={onPlayAgain}
            className="h-14 px-8 text-lg font-bold bg-brand hover:bg-brand-dark text-white rounded-2xl shadow-xl transition-all hover:scale-105"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            New Duel
          </Button>
          <Button
            onClick={onHome}
            variant="outline"
            className="h-14 px-8 text-lg font-bold rounded-2xl border-2"
          >
            <Home className="h-5 w-5 mr-2" />
            Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DuelGameOverView;

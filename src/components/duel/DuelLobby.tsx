import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Check,
  Copy,
  Crown,
  Eye,
  Heart,
  Hourglass,
  Link2,
  LogOut,
  Swords,
  Timer,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DuelInfo, DuelPlayer } from '@/types/duel';

interface DuelLobbyProps {
  duel: DuelInfo;
  players: DuelPlayer[];
  myId: string | null;
  isHost: boolean;
  starting: boolean;
  onlinePlayerIds: Set<string>;
  spectatorCount: number;
  onStart: () => void;
  onLeave: () => void;
}

const DuelLobby: React.FC<DuelLobbyProps> = ({
  duel,
  players,
  myId,
  isHost,
  starting,
  onlinePlayerIds,
  spectatorCount,
  onStart,
  onLeave,
}) => {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const isSpectator = !myId;
  const full = players.length >= 2;

  const copy = async (what: 'code' | 'link') => {
    const text =
      what === 'code'
        ? duel.code
        : `${window.location.origin}/duel/${duel.code}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      toast.success(what === 'code' ? 'Code copied!' : 'Invite link copied!');
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Could not copy — your browser blocked clipboard access');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-brand rounded-full flex items-center justify-center mx-auto">
            <Swords size={40} className="text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Duel Lobby
          </h2>
          <p className="text-lg text-gray-600">
            {isSpectator
              ? "You're spectating — the duel will start when the host is ready"
              : full
                ? 'Both duelists are here. Ready when you are!'
                : 'Share the code below with your opponent'}
          </p>
        </div>

        {/* Invite code */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 text-center space-y-4">
          <div className="font-space text-5xl font-bold tracking-[0.3em] text-gray-900 select-all">
            {duel.code}
          </div>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => copy('code')}
              variant="outline"
              className="rounded-xl border-2"
            >
              {copied === 'code' ? (
                <Check className="h-4 w-4 mr-2 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Copy code
            </Button>
            <Button
              onClick={() => copy('link')}
              variant="outline"
              className="rounded-xl border-2"
            >
              {copied === 'link' ? (
                <Check className="h-4 w-4 mr-2 text-emerald-600" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Copy invite link
            </Button>
          </div>
        </div>

        {/* Players */}
        <div className="space-y-3">
          {players.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 bg-white border-2 border-gray-200 rounded-2xl px-5 py-4"
            >
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${
                  onlinePlayerIds.has(p.id) ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              />
              <span className="text-lg font-semibold text-gray-900">
                {p.display_name}
                {p.id === myId && (
                  <span className="text-gray-400 font-normal"> (you)</span>
                )}
              </span>
              {p.is_host && (
                <span className="ml-auto flex items-center gap-1 text-amber-600 text-sm font-medium">
                  <Crown size={16} /> Host
                </span>
              )}
            </motion.div>
          ))}
          {!full && (
            <div className="flex items-center gap-3 border-2 border-dashed border-gray-300 rounded-2xl px-5 py-4 text-gray-500">
              <Hourglass size={18} className="animate-pulse" />
              Waiting for an opponent to join…
            </div>
          )}
        </div>

        {/* Match settings */}
        <div className="flex flex-wrap gap-2 justify-center text-sm">
          <span className="inline-flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 text-gray-700">
            <Heart size={14} className="text-brand" />
            {duel.starting_hp.toLocaleString()} HP
          </span>
          <span className="inline-flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 text-gray-700">
            <Timer size={14} className="text-brand" />
            {duel.round_seconds}s per round
          </span>
          <span className="inline-flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 text-gray-700">
            <Zap size={14} className="text-brand" />
            {duel.guess_window_seconds}s after first guess
          </span>
          {spectatorCount > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 text-gray-700">
              <Eye size={14} className="text-brand" />
              {spectatorCount} watching
            </span>
          )}
        </div>

        {/* Actions */}
        {isHost && (
          <Button
            onClick={onStart}
            disabled={!full || starting}
            className="w-full h-16 text-xl font-bold bg-brand hover:bg-brand-dark text-white rounded-2xl shadow-xl transition-all hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:hover:scale-100"
          >
            {starting
              ? 'Starting…'
              : full
                ? 'Start Duel ⚔️'
                : 'Waiting for opponent…'}
          </Button>
        )}
        {!isHost && !isSpectator && (
          <p className="text-center text-gray-500">
            Waiting for the host to start the duel…
          </p>
        )}

        {!isSpectator && (
          <div className="text-center">
            <button
              onClick={onLeave}
              className="inline-flex items-center gap-1.5 text-gray-500 hover:text-brand transition-colors text-sm"
            >
              <LogOut size={14} />
              Leave lobby
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DuelLobby;

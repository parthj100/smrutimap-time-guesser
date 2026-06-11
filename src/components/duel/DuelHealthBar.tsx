import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown } from 'lucide-react';
import type { DuelPlayer } from '@/types/duel';

interface DuelHealthBarProps {
  player: DuelPlayer;
  maxHp: number;
  isMe?: boolean;
  online?: boolean;
  align?: 'left' | 'right';
}

/** Animated HP bar with a floating damage popup when health drops. */
const DuelHealthBar: React.FC<DuelHealthBarProps> = ({
  player,
  maxHp,
  isMe = false,
  online = true,
  align = 'left',
}) => {
  const pct = Math.max(0, Math.min(100, (player.hp / maxHp) * 100));
  const prevHpRef = useRef(player.hp);
  const [damagePopup, setDamagePopup] = useState<{ amount: number; key: number } | null>(null);

  useEffect(() => {
    const diff = prevHpRef.current - player.hp;
    prevHpRef.current = player.hp;
    if (diff > 0) {
      setDamagePopup({ amount: diff, key: Date.now() });
      const t = window.setTimeout(() => setDamagePopup(null), 1800);
      return () => window.clearTimeout(t);
    }
  }, [player.hp]);

  const barColor =
    pct > 50 ? 'bg-emerald-500' : pct > 25 ? 'bg-amber-500' : 'bg-brand';
  const rightAligned = align === 'right';

  return (
    <div className={`relative w-full ${rightAligned ? 'text-right' : 'text-left'}`}>
      <div
        className={`flex items-center gap-2 mb-1 ${rightAligned ? 'flex-row-reverse' : ''}`}
      >
        <span
          className={`inline-block w-2 h-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-gray-300'}`}
          title={online ? 'Connected' : 'Disconnected'}
        />
        <span className="font-semibold text-gray-900 truncate max-w-[10rem]">
          {player.display_name}
          {isMe && <span className="text-gray-400 font-normal"> (you)</span>}
        </span>
        {player.is_host && <Crown size={14} className="text-amber-500 shrink-0" />}
        <span className="font-space font-bold text-gray-900 ml-auto tabular-nums">
          {player.hp.toLocaleString()}
        </span>
      </div>
      <div className="h-4 w-full rounded-full bg-gray-200 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor} ${rightAligned ? 'ml-auto' : ''}`}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
      <AnimatePresence>
        {damagePopup && (
          <motion.span
            key={damagePopup.key}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: -16 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
            className={`absolute -top-4 ${rightAligned ? 'left-0' : 'right-0'} font-space font-bold text-brand text-lg pointer-events-none`}
          >
            −{damagePopup.amount.toLocaleString()}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DuelHealthBar;

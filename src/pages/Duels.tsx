import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Eye, Home, LogIn, Plus, Swords } from 'lucide-react';
import { createDuel, joinDuel } from '@/services/duelService';

type View = 'menu' | 'create' | 'join';

const HP_OPTIONS = [
  { value: 6000, label: 'Quick', hint: '6,000 HP' },
  { value: 12000, label: 'Standard', hint: '12,000 HP' },
  { value: 24000, label: 'Marathon', hint: '24,000 HP' },
];
const ROUND_TIME_OPTIONS = [60, 120, 180];
const GUESS_WINDOW_OPTIONS = [10, 15, 30];

const optionButton = (selected: boolean) =>
  `flex-1 rounded-xl border-2 px-3 py-3 text-center transition-all ${
    selected
      ? 'border-brand bg-brand text-white font-bold shadow-md'
      : 'border-gray-200 bg-white text-gray-700 hover:border-brand/50'
  }`;

/** /duels — create a duel, join with a code, or spectate. */
const DuelsPage: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('menu');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem('smrutimap_duel_name') || ''
  );
  const [code, setCode] = useState('');
  const [spectate, setSpectate] = useState(false);
  const [hp, setHp] = useState(12000);
  const [roundSeconds, setRoundSeconds] = useState(120);
  const [guessWindow, setGuessWindow] = useState(15);

  const rememberName = (name: string) => {
    try {
      localStorage.setItem('smrutimap_duel_name', name);
    } catch {
      /* non-fatal */
    }
  };

  const handleCreate = async () => {
    if (!displayName.trim()) {
      setError('Please enter your display name');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      rememberName(displayName.trim());
      const res = await createDuel(displayName.trim(), {
        starting_hp: hp,
        round_seconds: roundSeconds,
        guess_window_seconds: guessWindow,
      });
      navigate(`/duel/${res.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create duel');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError('Enter the 6-character duel code');
      return;
    }
    if (spectate) {
      navigate(`/duel/${trimmed}`);
      return;
    }
    if (!displayName.trim()) {
      setError('Please enter your display name');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      rememberName(displayName.trim());
      const res = await joinDuel(trimmed, displayName.trim());
      navigate(`/duel/${res.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join duel');
    } finally {
      setIsLoading(false);
    }
  };

  const cornerNav = (back: () => void) => (
    <>
      <div className="fixed top-6 left-6 z-10">
        <Button
          onClick={back}
          className="bg-brand hover:bg-brand-dark text-white px-6 py-3 rounded-xl text-lg font-bold shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
      </div>
      <div className="fixed top-6 right-6 z-10">
        <Button
          onClick={() => navigate('/')}
          className="bg-brand hover:bg-brand-dark text-white px-6 py-3 rounded-xl text-lg font-bold shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
        >
          <Home className="h-5 w-5 mr-2" />
          Home
        </Button>
      </div>
    </>
  );

  if (view === 'create') {
    return (
      <div className="min-h-screen bg-white relative">
        {cornerNav(() => setView('menu'))}
        <div className="flex items-center justify-center min-h-screen p-6">
          <div className="max-w-lg w-full space-y-8 py-20">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-brand rounded-full flex items-center justify-center mx-auto">
                <Plus size={40} className="text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Set up your duel ⚔️
              </h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-3">
                  What should we call you? 👋
                </label>
                <Input
                  type="text"
                  placeholder="Enter your display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={20}
                  className="h-14 text-lg border-2 border-gray-200 rounded-2xl focus:border-brand focus:ring-0 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-3">
                  Health pool ❤️
                </label>
                <div className="flex gap-3">
                  {HP_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setHp(o.value)}
                      className={optionButton(hp === o.value)}
                    >
                      <div className="font-bold">{o.label}</div>
                      <div
                        className={`text-xs ${hp === o.value ? 'text-white/80' : 'text-gray-500'}`}
                      >
                        {o.hint}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-3">
                  Round time ⏱️
                </label>
                <div className="flex gap-3">
                  {ROUND_TIME_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setRoundSeconds(s)}
                      className={optionButton(roundSeconds === s)}
                    >
                      <div className="font-bold">{s}s</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-3">
                  Time after first guess ⚡
                </label>
                <div className="flex gap-3">
                  {GUESS_WINDOW_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setGuessWindow(s)}
                      className={optionButton(guessWindow === s)}
                    >
                      <div className="font-bold">{s}s</div>
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Once one player locks in, the other has this long to answer
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-red-600 font-medium text-center">{error}</p>
                </div>
              )}

              <Button
                onClick={handleCreate}
                disabled={isLoading}
                className="w-full h-16 text-xl font-bold bg-brand hover:bg-brand-dark text-white rounded-2xl shadow-xl transition-all hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:hover:scale-100"
              >
                {isLoading ? 'Creating duel…' : 'Create Duel ⚔️'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'join') {
    return (
      <div className="min-h-screen bg-white relative">
        {cornerNav(() => setView('menu'))}
        <div className="flex items-center justify-center min-h-screen p-6">
          <div className="max-w-lg w-full space-y-8 py-20">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-brand rounded-full flex items-center justify-center mx-auto">
                <LogIn size={40} className="text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Join a duel 🎯
              </h2>
              <p className="text-lg text-gray-600">
                Enter the code your opponent shared with you
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-3">
                  Duel code 🔑
                </label>
                <Input
                  type="text"
                  placeholder="ABC123"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="h-14 text-lg border-2 border-gray-200 rounded-2xl focus:border-brand focus:ring-0 placeholder-gray-400 uppercase tracking-[0.3em] font-space text-center"
                />
              </div>

              {!spectate && (
                <div>
                  <label className="block text-lg font-semibold text-gray-900 mb-3">
                    What should we call you? 👋
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter your display name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={20}
                    className="h-14 text-lg border-2 border-gray-200 rounded-2xl focus:border-brand focus:ring-0 placeholder-gray-400"
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  id="duel-spectator-toggle"
                  type="checkbox"
                  checked={spectate}
                  onChange={(e) => setSpectate(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-brand focus:ring-brand"
                />
                <label htmlFor="duel-spectator-toggle" className="text-gray-700">
                  Watch as a spectator (view-only)
                </label>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-red-600 font-medium text-center">{error}</p>
                </div>
              )}

              <Button
                onClick={handleJoin}
                disabled={isLoading}
                className="w-full h-16 text-xl font-bold bg-brand hover:bg-brand-dark text-white rounded-2xl shadow-xl transition-all hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:hover:scale-100"
              >
                {isLoading
                  ? 'Joining…'
                  : spectate
                    ? 'Watch Duel 👁️'
                    : 'Join Duel 🎮'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative">
      {cornerNav(() => navigate('/'))}
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-lg w-full space-y-8">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-brand rounded-full flex items-center justify-center mx-auto">
              <Swords size={40} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Duels ⚔️
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Go head-to-head: same photo, one guess each. The sharper guess
                deals damage — drop your rival to zero HP to win.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => {
                setError('');
                setView('create');
              }}
              className="group w-full p-6 rounded-2xl border-2 border-gray-200 bg-white hover:border-brand hover:shadow-lg transition-all duration-200 text-left hover:scale-[1.02]"
            >
              <div className="flex items-center space-x-4">
                <span className="text-3xl">⚔️</span>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-brand transition-colors">
                    Create a Duel
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Get a code and challenge a friend on any device
                  </p>
                </div>
                <Plus className="w-6 h-6 text-gray-400 group-hover:text-brand transition-colors" />
              </div>
            </button>

            <button
              onClick={() => {
                setError('');
                setSpectate(false);
                setView('join');
              }}
              className="group w-full p-6 rounded-2xl border-2 border-gray-200 bg-white hover:border-brand hover:shadow-lg transition-all duration-200 text-left hover:scale-[1.02]"
            >
              <div className="flex items-center space-x-4">
                <span className="text-3xl">🎯</span>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-brand transition-colors">
                    Join a Duel
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Enter a code to face your challenger
                  </p>
                </div>
                <LogIn className="w-6 h-6 text-gray-400 group-hover:text-brand transition-colors" />
              </div>
            </button>

            <button
              onClick={() => {
                setError('');
                setSpectate(true);
                setView('join');
              }}
              className="group w-full p-6 rounded-2xl border-2 border-gray-200 bg-white hover:border-brand hover:shadow-lg transition-all duration-200 text-left hover:scale-[1.02]"
            >
              <div className="flex items-center space-x-4">
                <span className="text-3xl">👁️</span>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-brand transition-colors">
                    Spectate
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Watch a live duel without playing
                  </p>
                </div>
                <Eye className="w-6 h-6 text-gray-400 group-hover:text-brand transition-colors" />
              </div>
            </button>
          </div>

          <div className="text-center">
            <p className="text-gray-500 text-sm">
              💡 Damage ramps up every round after the 4th — duels always end!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DuelsPage;

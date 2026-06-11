import React, { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Eye, Flag, Home } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingStates';
import { useDuel } from '@/hooks/useDuel';
import DuelLobby from '@/components/duel/DuelLobby';
import DuelRoundView from '@/components/duel/DuelRoundView';
import DuelResultsView from '@/components/duel/DuelResultsView';
import DuelGameOverView from '@/components/duel/DuelGameOverView';

/** /duel/:code — lobby, live match, round results and game-over screens.
 *  Players are recognized via their stored token; everyone else spectates. */
const DuelPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const duel = useDuel(code);

  const handleLeave = useCallback(async () => {
    const inMatch = duel.phase === 'round' || duel.phase === 'results';
    if (
      inMatch &&
      !window.confirm('Leaving now forfeits the duel. Leave anyway?')
    ) {
      return;
    }
    try {
      await duel.leave();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not leave the duel');
      return;
    }
    if (!inMatch) navigate('/');
    // After a mid-match forfeit we stay: the game-over screen shows the result.
  }, [duel, navigate]);

  if (duel.phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading duel…</p>
        </div>
      </div>
    );
  }

  if (duel.phase === 'error' || !duel.state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream p-6">
        <div className="max-w-md w-full bg-white border-2 border-gray-200 rounded-2xl p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Duel not found</h1>
          <p className="text-gray-600">
            {duel.error || 'This duel may have expired or the code is wrong.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => navigate('/duels')}
              className="bg-brand hover:bg-brand-dark text-white rounded-xl font-bold"
            >
              Back to Duels
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="rounded-xl border-2"
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { state } = duel;
  const maxHp = state.duel.starting_hp;

  return (
    <div className="bg-cream min-h-screen">
      {duel.phase === 'lobby' && (
        <DuelLobby
          duel={state.duel}
          players={duel.players}
          myId={state.me}
          isHost={duel.isHost}
          starting={duel.starting}
          onlinePlayerIds={duel.onlinePlayerIds}
          spectatorCount={duel.spectatorCount}
          onStart={() =>
            duel.startMatch().catch((e) =>
              toast.error(
                e instanceof Error ? e.message : 'Could not start the duel'
              )
            )
          }
          onLeave={handleLeave}
        />
      )}

      {duel.phase === 'round' && state.round && (
        <DuelRoundView
          players={duel.players}
          myId={state.me}
          maxHp={maxHp}
          round={state.round}
          image={duel.image}
          myGuess={state.my_guess}
          iHaveGuessed={duel.iHaveGuessed}
          opponentHasGuessed={duel.opponentHasGuessed}
          guessWindowArmed={duel.guessWindowArmed}
          remainingMs={duel.roundRemainingMs}
          submitting={duel.submitting}
          onlinePlayerIds={duel.onlinePlayerIds}
          spectatorCount={duel.spectatorCount}
          onSubmit={duel.submitGuess}
        />
      )}

      {duel.phase === 'results' &&
        (duel.roundResults &&
        duel.roundResults.round_number === state.round?.round_number ? (
          <DuelResultsView
            players={duel.players}
            myId={state.me}
            maxHp={maxHp}
            results={duel.roundResults}
            resultsRemainingMs={duel.resultsRemainingMs}
            onlinePlayerIds={duel.onlinePlayerIds}
            spectatorCount={duel.spectatorCount}
          />
        ) : (
          <div className="min-h-screen flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ))}

      {duel.phase === 'over' && (
        <DuelGameOverView
          duel={state.duel}
          players={duel.players}
          myId={state.me}
          summary={duel.summary}
          finalRound={duel.roundResults}
          onlinePlayerIds={duel.onlinePlayerIds}
          onPlayAgain={() => navigate('/duels')}
          onHome={() => navigate('/')}
        />
      )}

      {/* Persistent corner controls during lobby/match */}
      {(duel.phase === 'round' || duel.phase === 'results') && duel.isPlayer && (
        <button
          onClick={handleLeave}
          className="fixed bottom-4 left-4 z-20 inline-flex items-center gap-1.5 bg-white/90 backdrop-blur border border-gray-200 text-gray-600 hover:text-brand px-3 py-2 rounded-xl text-sm font-medium shadow-lg transition-colors"
        >
          <Flag size={14} />
          Forfeit
        </button>
      )}

      {duel.isSpectator &&
        (duel.phase === 'round' || duel.phase === 'results') && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-2 bg-gray-900/85 text-white px-4 py-2 rounded-full text-sm shadow-lg pointer-events-none">
            <Eye size={14} />
            Spectator mode
          </div>
        )}
    </div>
  );
};

export default DuelPage;

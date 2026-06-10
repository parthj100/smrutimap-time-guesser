# Game.tsx decomposition plan

`src/components/Game.tsx` is the app's largest and most critical component
(~1040 lines, 13 `useState`, multiple effects, ~28 handlers, and the render
branches for every game mode). It is the single highest-risk file to refactor
because a subtle regression (stale closure, effect-order change, missed dep)
breaks the core game loop.

## Done
- Extracted the multiplayer final-standings render into
  `MultiplayerFinalStandings.tsx` (presentational, verifiable by tsc + the
  unchanged markup). This also fixed a latent `never[]` typing on the standings
  array.

## Prerequisite before the next steps
Add a component test harness (jsdom + @testing-library/react) and a smoke test
that drives a full single-player round (mount → guess → submit → next → finish)
with the Supabase client and game hooks mocked. Each extraction below should be
green against that test before and after.

## Sequence (each is its own PR, smallest blast radius first)
1. **Pure helpers / constants** — move the `GameMode` union and any non-hook
   helpers to module scope or a sibling file. Zero behavior risk.
2. **Single-player game-over views** — the `story` / `detailed` / `leaderboard`
   render branches are largely presentational; extract each like
   `MultiplayerFinalStandings` (props in → JSX out).
3. **Daily-challenge orchestration** — the `checkDailyChallengeStatus` effect +
   `handleDailyChallengeClick` / `handleRefreshDailyChallenge` form a cohesive
   unit; move into a `useDailyChallengeFlow` hook returning state + handlers.
4. **Session save / completion** — `handleCompleteGameAndGoHome`,
   `completeGameSession` wiring, and the `isCompletingGame` flag into a
   `useGameCompletion` hook.
5. **Mode routing** — once the above shrink the body, the remaining render is a
   mode switch; consider a small router/map keyed by `gameMode`.

Target: Game.tsx as a coordinator under ~400 lines, with the heavy logic in
focused, individually-testable hooks/components.

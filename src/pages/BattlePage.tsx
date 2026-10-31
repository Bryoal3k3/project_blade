import { useEffect, useLayoutEffect, useState } from 'react';
import { FINISH_LABELS, FINISH_POINTS, POINTS_TO_WIN, fighterFrom, simulateBattle, type BattleResult, type Finish } from '../data/battle';
import type { Collection } from '../hooks/useCollection';
import type { Saved } from '../hooks/useSaved';
import { unlockSound, playFinish } from '../lib/sound';
import { BattleArena } from '../components/BattleArena';
import { BeyPicture } from '../components/BeyPicture';
import { FighterPicker, resolveFighter, type FighterRef, type ResolvedFighter } from '../components/FighterPicker';
import { Icon } from '../components/Icon';

type Mode = 'app' | 'score';
const SIDE_NAMES = ['Red', 'Blue'] as const;

function SideCard({ side, fighter, onPick, points }: { side: 0 | 1; fighter?: ResolvedFighter; onPick: () => void; points?: number }) {
  return (
    <button type="button" className={`side-card side-${side}`} onClick={onPick} aria-label={fighter ? `${SIDE_NAMES[side]}: ${fighter.name}. Change` : `Pick the ${SIDE_NAMES[side].toLowerCase()} Bey`}>
      <span className="side-label">{SIDE_NAMES[side]}</span>
      <span className="side-pic">{fighter ? <BeyPicture bey={fighter.bey} /> : <span className="slot-empty">?</span>}</span>
      <span className="side-name">{fighter ? fighter.name : 'Pick a Bey'}</span>
      {fighter && <span className="side-combo">{fighter.combo}</span>}
      {points !== undefined && <span className="side-points">{points}</span>}
    </button>
  );
}

function AppBattle({ collection, saved }: { collection: Collection; saved: Saved }) {
  const [sides, setSides] = useState<[FighterRef?, FighterRef?]>([]);
  const [picking, setPicking] = useState<0 | 1 | null>(null);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [round, setRound] = useState<{ result: BattleResult; n: number } | null>(null);
  const [phase, setPhase] = useState<'setup' | 'fight' | 'result'>('setup');
  const fighters = [resolveFighter(sides[0], saved.builds), resolveFighter(sides[1], saved.builds)] as const;
  const matchWinner = score[0] >= POINTS_TO_WIN ? 0 : score[1] >= POINTS_TO_WIN ? 1 : null;

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [phase, picking]);

  const fight = () => {
    if (!fighters[0] || !fighters[1]) return;
    unlockSound();
    const result = simulateBattle(fighterFrom(fighters[0].bey), fighterFrom(fighters[1].bey));
    setRound((prev) => ({ result, n: (prev?.n ?? 0) + 1 }));
    setPhase('fight');
  };

  const roundOver = () => {
    if (!round) return;
    const { winner, finish } = round.result;
    if (winner !== null && finish) {
      const next: [number, number] = [...score];
      next[winner] += FINISH_POINTS[finish];
      setScore(next);
      if (next[winner] >= POINTS_TO_WIN) saved.finishMatch();
    }
    setPhase('result');
  };

  const newMatch = () => {
    setScore([0, 0]);
    setRound(null);
    setPhase('setup');
  };

  if (picking !== null) {
    return (
      <FighterPicker
        title={`Pick the ${SIDE_NAMES[picking].toLowerCase()} Bey`}
        builds={saved.builds}
        mine={collection.lists.mine}
        onClose={() => setPicking(null)}
        onPick={(ref) => {
          setSides((prev) => {
            const next: [FighterRef?, FighterRef?] = [...prev];
            next[picking] = ref;
            return next;
          });
          setScore([0, 0]);
          setRound(null);
          setPhase('setup');
          setPicking(null);
        }}
      />
    );
  }

  if (phase === 'fight' && round && fighters[0] && fighters[1]) {
    return <BattleArena key={round.n} beys={[fighters[0].bey, fighters[1].bey]} names={[fighters[0].name, fighters[1].name]} result={round.result} onDone={roundOver} />;
  }

  const last = round?.result;
  return (
    <div className="app-battle">
      {phase === 'result' && last && (
        <div className="round-result" role="status">
          {matchWinner !== null ? (
            <>
              <span className="round-kicker">Match winner</span>
              <b className="round-title">{fighters[matchWinner]?.name} wins!</b>
            </>
          ) : last.winner !== null && last.finish ? (
            <>
              <span className="round-kicker">Round {round?.n}</span>
              <b className="round-title">{FINISH_LABELS[last.finish]}!</b>
              <span className="round-sub">
                {fighters[last.winner]?.name} gets {FINISH_POINTS[last.finish]} {FINISH_POINTS[last.finish] === 1 ? 'point' : 'points'}
              </span>
            </>
          ) : (
            <>
              <span className="round-kicker">Round {round?.n}</span>
              <b className="round-title">Draw!</b>
              <span className="round-sub">Nobody scores. Go again!</span>
            </>
          )}
        </div>
      )}

      <div className="versus">
        <SideCard side={0} fighter={fighters[0]} onPick={() => setPicking(0)} points={phase !== 'setup' || score[0] || score[1] ? score[0] : undefined} />
        <span className="vs">VS</span>
        <SideCard side={1} fighter={fighters[1]} onPick={() => setPicking(1)} points={phase !== 'setup' || score[0] || score[1] ? score[1] : undefined} />
      </div>
      <p className="battle-rule">First to {POINTS_TO_WIN} points wins the match.</p>

      {matchWinner === null ? (
        <button type="button" className="fuse-btn rip-btn" onClick={fight} disabled={!fighters[0] || !fighters[1]}>
          {round ? 'Next round!' : 'Let it rip!'}
        </button>
      ) : (
        <button type="button" className="big-btn" onClick={newMatch}>
          New match
        </button>
      )}
      {round && matchWinner === null && (
        <button type="button" className="big-btn ghost" onClick={newMatch}>
          Start the match over
        </button>
      )}
    </div>
  );
}

interface ScoreState {
  names: [string, string];
  beys: [FighterRef?, FighterRef?];
  log: { player: 0 | 1; finish: Finish }[];
}

const SCORE_KEY = 'project-blade:score:v1';

function loadScore(): ScoreState {
  try {
    const saved = JSON.parse(localStorage.getItem(SCORE_KEY) ?? 'null');
    if (saved && Array.isArray(saved.names) && Array.isArray(saved.log)) {
      return { names: [String(saved.names[0] ?? 'Player 1'), String(saved.names[1] ?? 'Player 2')], beys: Array.isArray(saved.beys) ? saved.beys : [], log: saved.log };
    }
  } catch {
    // Storage blocked or corrupted: start a fresh match.
  }
  return { names: ['Player 1', 'Player 2'], beys: [], log: [] };
}

const SCORE_BUTTONS: Finish[] = ['spin', 'over', 'burst', 'xtreme'];

/** Keeps score for real battles: tap the finish, first to 4 points wins. */
function ScoreKeeper({ collection, saved }: { collection: Collection; saved: Saved }) {
  const [state, setState] = useState<ScoreState>(loadScore);
  const [picking, setPicking] = useState<0 | 1 | null>(null);
  const points = [0, 1].map((p) => state.log.filter((r) => r.player === p).reduce((sum, r) => sum + FINISH_POINTS[r.finish], 0));
  const winner = points[0] >= POINTS_TO_WIN ? 0 : points[1] >= POINTS_TO_WIN ? 1 : null;

  useEffect(() => {
    try {
      localStorage.setItem(SCORE_KEY, JSON.stringify(state));
    } catch {
      // Storage blocked: the score lasts until the app closes.
    }
  }, [state]);

  const add = (player: 0 | 1, finish: Finish) => {
    if (winner !== null) return;
    unlockSound();
    const after = points[player] + FINISH_POINTS[finish];
    if (after >= POINTS_TO_WIN) playFinish();
    setState((prev) => ({ ...prev, log: [...prev.log, { player, finish }] }));
  };
  const rename = (player: 0 | 1, name: string) =>
    setState((prev) => {
      const names: [string, string] = [...prev.names];
      names[player] = name;
      return { ...prev, names };
    });

  if (picking !== null) {
    return (
      <FighterPicker
        title={`Pick ${state.names[picking] || 'their'}'s Bey`}
        builds={saved.builds}
        mine={collection.lists.mine}
        onClose={() => setPicking(null)}
        onPick={(ref) => {
          setState((prev) => {
            const beys: [FighterRef?, FighterRef?] = [...prev.beys];
            beys[picking] = ref;
            return { ...prev, beys };
          });
          setPicking(null);
        }}
      />
    );
  }

  return (
    <div className="score-keeper">
      <div className="score-columns">
        {([0, 1] as const).map((p) => {
          const fighter = resolveFighter(state.beys[p], saved.builds);
          return (
            <div key={p} className={`score-col side-${p}`}>
              <label className="score-name">
                <span className="visually-hidden">Player {p + 1} name</span>
                <input id={`player-${p}`} value={state.names[p]} maxLength={14} onChange={(e) => rename(p, e.target.value)} />
              </label>
              <button type="button" className="score-bey" onClick={() => setPicking(p)} aria-label={fighter ? `${fighter.name}. Change Bey` : 'Pick a Bey'}>
                {fighter ? <BeyPicture bey={fighter.bey} /> : <span className="slot-empty">?</span>}
                <span>{fighter ? fighter.name : 'Pick a Bey'}</span>
              </button>
              <span className="score-big" aria-label={`${points[p]} points`}>
                {points[p]}
              </span>
              <div className="score-buttons">
                {SCORE_BUTTONS.map((finish) => (
                  <button key={finish} type="button" className="score-btn" onClick={() => add(p, finish)} disabled={winner !== null}>
                    <b>{FINISH_LABELS[finish].replace(' Finish', '')}</b>
                    <span>+{FINISH_POINTS[finish]}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {winner !== null && (
        <div className="round-result" role="status">
          <span className="round-kicker">Match winner</span>
          <b className="round-title">{state.names[winner] || `Player ${winner + 1}`} wins!</b>
        </div>
      )}

      <div className="score-actions">
        <button type="button" className="big-btn ghost" onClick={() => setState((prev) => ({ ...prev, log: prev.log.slice(0, -1) }))} disabled={!state.log.length}>
          Undo
        </button>
        <button type="button" className="big-btn" onClick={() => setState((prev) => ({ ...prev, log: [] }))} disabled={!state.log.length}>
          New match
        </button>
      </div>

      {state.log.length > 0 && (
        <ol className="score-log">
          {state.log.map((r, i) => (
            <li key={i}>
              <span>Round {i + 1}</span>
              <b>{state.names[r.player] || `Player ${r.player + 1}`}</b>
              <span>
                {FINISH_LABELS[r.finish]} +{FINISH_POINTS[r.finish]}
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="battle-rule">Spin Finish 1 point · Over and Burst 2 · Xtreme 3 · First to {POINTS_TO_WIN} wins.</p>
    </div>
  );
}

export function BattlePage({ collection, saved }: { collection: Collection; saved: Saved }) {
  const [mode, setMode] = useState<Mode>('app');
  return (
    <main className="page battle-page">
      <header className="list-head">
        <span className="app-label">Project Blade</span>
        <h1 className="list-title">Battle!</h1>
      </header>
      <div className="mode-switch" role="tablist" aria-label="Battle mode">
        <button type="button" role="tab" aria-selected={mode === 'app'} onClick={() => setMode('app')}>
          <Icon name="battle" />
          Battle in the app
        </button>
        <button type="button" role="tab" aria-selected={mode === 'score'} onClick={() => setMode('score')}>
          <Icon name="star" />
          Keep score
        </button>
      </div>
      {mode === 'app' ? <AppBattle collection={collection} saved={saved} /> : <ScoreKeeper collection={collection} saved={saved} />}
    </main>
  );
}

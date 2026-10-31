import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FINISH_LABELS, FINISH_POINTS, POINTS_TO_WIN, fighterFrom, simulateBattle, type BattleResult, type Finish } from '../data/battle';
import { BEYS } from '../data';
import { TYPE_INFO } from '../data/meta';
import type { Collection } from '../hooks/useCollection';
import type { Saved } from '../hooks/useSaved';
import { unlockSound, playFinish, playTick } from '../lib/sound';
import { BattleArena } from '../components/BattleArena';
import { FINISH_ICON, FaceOff, Pips, SIDE_NAMES, Scoreboard, Spotlight } from '../components/BattleBits';
import { BeyPicture } from '../components/BeyPicture';
import { FighterPicker, resolveFighter, type FighterRef, type ResolvedFighter } from '../components/FighterPicker';
import { Icon } from '../components/Icon';
import { typeVars } from '../components/TypeChips';

type Mode = 'app' | 'score';
interface RoundLog {
  winner: 0 | 1 | null;
  finish?: Finish;
}

function SideCard({ side, fighter, onPick, shuffling }: { side: 0 | 1; fighter?: ResolvedFighter; onPick: () => void; shuffling: boolean }) {
  const type = fighter && TYPE_INFO[fighter.bey.type];
  return (
    <button
      type="button"
      className={`side-card side-${side}${shuffling ? ' is-shuffling' : ''}`}
      onClick={onPick}
      disabled={shuffling}
      aria-label={fighter ? `${SIDE_NAMES[side]}: ${fighter.name}. Change` : `Pick the ${SIDE_NAMES[side].toLowerCase()} Bey`}
    >
      <span className="side-label">{SIDE_NAMES[side]}</span>
      <span className="side-pic">
        <span className="side-ring" />
        {fighter ? (
          <BeyPicture bey={fighter.bey} spin={!shuffling} />
        ) : (
          <span className="side-empty" aria-hidden="true">
            +
          </span>
        )}
      </span>
      {fighter && type ? (
        <>
          <span className="type-badge small" style={typeVars(fighter.bey.type)}>
            <Icon name={type.icon} />
            <span>{type.label}</span>
          </span>
          <span className="side-name">{fighter.name}</span>
          <span className="side-combo">{fighter.combo}</span>
        </>
      ) : (
        <span className="side-name">Pick a Bey</span>
      )}
    </button>
  );
}

function RipButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="rip-btn" onClick={onClick} disabled={disabled}>
      <Icon name="bolt" />
      <span>{label}</span>
      <Icon name="bolt" />
    </button>
  );
}

function Rounds({ log, names }: { log: RoundLog[]; names: [string, string] }) {
  if (!log.length) return null;
  return (
    <ol className="round-log" aria-label="Rounds so far">
      {log.map((r, i) => (
        <li key={i} className={r.winner === null || !r.finish ? 'is-draw' : `side-${r.winner}`}>
          <span className="rl-n">{i + 1}</span>
          {r.winner !== null && r.finish ? (
            <>
              <Icon name={FINISH_ICON[r.finish]} />
              <b aria-hidden="true">+{FINISH_POINTS[r.finish]}</b>
              <span className="visually-hidden">
                {names[r.winner]}, {FINISH_LABELS[r.finish]}
              </span>
            </>
          ) : (
            <b>Draw</b>
          )}
        </li>
      ))}
    </ol>
  );
}

function AppBattle({ collection, saved }: { collection: Collection; saved: Saved }) {
  const [sides, setSides] = useState<[FighterRef?, FighterRef?]>([]);
  const [picking, setPicking] = useState<0 | 1 | null>(null);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [log, setLog] = useState<RoundLog[]>([]);
  const [round, setRound] = useState<{ result: BattleResult; n: number } | null>(null);
  const [phase, setPhase] = useState<'setup' | 'fight' | 'result'>('setup');
  const [shuffling, setShuffling] = useState(false);
  const shuffleTimer = useRef<number | undefined>(undefined);
  const fighters = [resolveFighter(sides[0], saved.builds), resolveFighter(sides[1], saved.builds)] as const;
  const ready = Boolean(fighters[0] && fighters[1]) && !shuffling;
  const matchWinner = score[0] >= POINTS_TO_WIN ? 0 : score[1] >= POINTS_TO_WIN ? 1 : null;

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [phase, picking]);
  useEffect(() => () => window.clearInterval(shuffleTimer.current), []);

  const resetMatch = () => {
    setScore([0, 0]);
    setLog([]);
    setRound(null);
    setPhase('setup');
  };

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
    setLog((prev) => [...prev, { winner, finish }]);
    setPhase('result');
  };

  /** Spins through random Beys like a slot machine, then lands on two. */
  const randomize = () => {
    unlockSound();
    window.clearInterval(shuffleTimer.current);
    resetMatch();
    setShuffling(true);
    const roll = () => {
      const a = Math.floor(Math.random() * BEYS.length);
      let b = Math.floor(Math.random() * (BEYS.length - 1));
      if (b >= a) b++;
      setSides([
        { kind: 'bey', id: BEYS[a].id },
        { kind: 'bey', id: BEYS[b].id },
      ]);
      playTick();
    };
    roll();
    let rolls = 1;
    shuffleTimer.current = window.setInterval(() => {
      roll();
      if (++rolls >= 10) {
        window.clearInterval(shuffleTimer.current);
        setShuffling(false);
      }
    }, 90);
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
          resetMatch();
          setPicking(null);
        }}
      />
    );
  }

  if (phase === 'fight' && round && fighters[0] && fighters[1]) {
    return (
      <BattleArena
        key={round.n}
        beys={[fighters[0].bey, fighters[1].bey]}
        names={[fighters[0].name, fighters[1].name]}
        result={round.result}
        score={score}
        round={round.n}
        onDone={roundOver}
      />
    );
  }

  if (phase === 'result' && round && fighters[0] && fighters[1]) {
    const last = round.result;
    const beys = [fighters[0], fighters[1]] as const;
    const before: [number, number] = [...score];
    if (last.winner !== null && last.finish) before[last.winner] -= FINISH_POINTS[last.finish];
    const names: [string, string] = [beys[0].name, beys[1].name];
    return (
      <div className="app-battle">
        {matchWinner !== null ? (
          <Spotlight kind="champion" bey={beys[matchWinner].bey} name={names[matchWinner]} side={matchWinner} score={score} />
        ) : last.winner !== null && last.finish ? (
          <Spotlight kind="round" round={round.n} bey={beys[last.winner].bey} name={names[last.winner]} side={last.winner} finish={last.finish} />
        ) : (
          <Spotlight kind="draw" round={round.n} beys={[beys[0].bey, beys[1].bey]} />
        )}
        <Scoreboard beys={[beys[0].bey, beys[1].bey]} names={names} score={score} before={before} center={<span className="sb-vs">VS</span>} />
        {matchWinner === null ? (
          <RipButton label="Next round!" onClick={fight} />
        ) : (
          <button type="button" className="big-btn wide" onClick={resetMatch}>
            New match
          </button>
        )}
        <Rounds log={log} names={names} />
        {matchWinner === null && (
          <button type="button" className="big-btn ghost wide" onClick={resetMatch}>
            Start the match over
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="app-battle">
      <div className="fight-card">
        <SideCard side={0} fighter={fighters[0]} onPick={() => setPicking(0)} shuffling={shuffling} />
        <span className="vs-badge" aria-hidden="true">
          <span>VS</span>
        </span>
        <SideCard side={1} fighter={fighters[1]} onPick={() => setPicking(1)} shuffling={shuffling} />
      </div>
      {!fighters[0] || !fighters[1] ? <p className="battle-hint">Tap Red and Blue to pick two Beys!</p> : null}
      <RipButton label="Let it rip!" onClick={fight} disabled={!ready} />
      <button type="button" className="big-btn ghost wide dice-btn" onClick={randomize} disabled={shuffling}>
        <Icon name="dice" />
        Random Beys
      </button>
      {ready && fighters[0] && fighters[1] && <FaceOff beys={[fighters[0].bey, fighters[1].bey]} />}
      <p className="battle-rule">
        <Pips points={0} />
        First to {POINTS_TO_WIN} points wins the match.
      </p>
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
  const champion = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (winner !== null) champion.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }, [winner]);

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
                {fighter ? (
                  <BeyPicture bey={fighter.bey} />
                ) : (
                  <span className="side-empty small" aria-hidden="true">
                    +
                  </span>
                )}
                <span>{fighter ? fighter.name : 'Pick a Bey'}</span>
              </button>
              <span className="score-big" aria-label={`${points[p]} points`}>
                {points[p]}
              </span>
              <Pips points={points[p]} />
              <div className="score-buttons">
                {SCORE_BUTTONS.map((finish) => (
                  <button key={finish} type="button" className={`score-btn finish-${finish}`} onClick={() => add(p, finish)} disabled={winner !== null}>
                    <b>{FINISH_LABELS[finish].replace(' Finish', '')}</b>
                    <span>
                      <Icon name={FINISH_ICON[finish]} />+{FINISH_POINTS[finish]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {winner !== null && (
        <div ref={champion}>
          <Spotlight
            kind="champion"
            bey={resolveFighter(state.beys[winner], saved.builds)?.bey}
            name={state.names[winner] || `Player ${winner + 1}`}
            side={winner}
            score={[points[0], points[1]]}
          />
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
            <li key={i} className={`side-${r.player}`}>
              <span>Round {i + 1}</span>
              <b>{state.names[r.player] || `Player ${r.player + 1}`}</b>
              <span className="log-finish">
                <Icon name={FINISH_ICON[r.finish]} />
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

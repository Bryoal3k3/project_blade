import type { CSSProperties, ReactNode, RefObject } from 'react';
import type { Bey } from '../data/types';
import { TYPE_INFO } from '../data/meta';
import { FINISH_LABELS, FINISH_POINTS, POINTS_TO_WIN, fighterFrom, typeEdge, type Finish } from '../data/battle';
import { BeyPicture } from './BeyPicture';
import { Icon, type IconName } from './Icon';

export const SIDE_NAMES = ['Red', 'Blue'] as const;
export const FINISH_ICON: Record<Finish, IconName> = { spin: 'spin', over: 'over', burst: 'burst', xtreme: 'xtreme' };

/** One light per point needed to win; lights that just came on pop. */
export function Pips({ points, from = points }: { points: number; from?: number }) {
  return (
    <span className="pips" aria-hidden="true">
      {Array.from({ length: POINTS_TO_WIN }, (_, i) => (
        <span key={i} className={['pip', i < points && 'on', i < points && i >= from && 'fresh'].filter(Boolean).join(' ')} />
      ))}
    </span>
  );
}

interface ScoreboardProps {
  beys: [Bey, Bey];
  names: [string, string];
  score: [number, number];
  /** The score before the last round, so the new lights can pop. */
  before?: [number, number];
  center: ReactNode;
  /** Spin meters, filled in by the battle animation. */
  meters?: [RefObject<HTMLSpanElement | null>, RefObject<HTMLSpanElement | null>];
}

/** Both Beys with their points, like the board over a real stadium. */
export function Scoreboard({ beys, names, score, before = score, center, meters }: ScoreboardProps) {
  return (
    <div className="scoreboard">
      {([0, 1] as const).map((i) => (
        <div key={i} className={`sb-side side-${i}`} style={{ order: i * 2 }}>
          <span className="sb-pic">
            <BeyPicture bey={beys[i]} />
          </span>
          <span className="sb-name">{names[i]}</span>
          <span className="sb-score" aria-label={`${names[i]}: ${score[i]} ${score[i] === 1 ? 'point' : 'points'}`}>
            <Pips points={score[i]} from={before[i]} />
            <b>{score[i]}</b>
          </span>
          {meters && (
            <span className="sb-meter" aria-hidden="true">
              <span className="meter-fill" ref={meters[i]} />
            </span>
          )}
        </div>
      ))}
      <div className="sb-center" style={{ order: 1 }}>
        {center}
      </div>
    </div>
  );
}

/** Falling paper bits for a match winner. Positions are spread evenly, so every render matches. */
export function Confetti() {
  const colors = ['#FF4D5E', '#3D8BFF', '#FFC93D', '#3DDC97', '#FF9A3C', '#FFFFFF'];
  return (
    <span className="confetti" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <i
          key={i}
          style={
            {
              left: `${(i * 37) % 100}%`,
              background: colors[i % colors.length],
              animationDelay: `${((i * 53) % 100) / 60}s`,
              animationDuration: `${1.8 + ((i * 29) % 10) / 8}s`,
              '--turn': `${((i * 71) % 2 ? 1 : -1) * (360 + ((i * 41) % 360))}deg`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

type SpotlightProps =
  | { kind: 'round'; round: number; bey: Bey; name: string; side: 0 | 1; finish: Finish }
  | { kind: 'draw'; round: number; beys: [Bey, Bey] }
  | { kind: 'champion'; bey?: Bey; name: string; side: 0 | 1; score: [number, number] };

/** The big moment after a round or a match: the winner under a spotlight. */
export function Spotlight(props: SpotlightProps) {
  if (props.kind === 'draw') {
    return (
      <div className="spotlight is-draw" role="status">
        <span className="spot-rays" aria-hidden="true" />
        <span className="round-kicker">Round {props.round}</span>
        <span className="spot-pics">
          <span className="spot-pic side-0">
            <BeyPicture bey={props.beys[0]} />
          </span>
          <span className="spot-pic side-1">
            <BeyPicture bey={props.beys[1]} />
          </span>
        </span>
        <b className="round-title">Draw!</b>
        <span className="round-sub">Nobody scores. Go again!</span>
      </div>
    );
  }
  if (props.kind === 'champion') {
    const [a, b] = props.score;
    return (
      <div className={`spotlight is-champion side-${props.side}`} role="status">
        <span className="spot-rays" aria-hidden="true" />
        <Confetti />
        <span className="round-kicker">Match winner</span>
        <span className="spot-pic">
          {props.bey ? <BeyPicture bey={props.bey} spin /> : null}
          <span className={props.bey ? 'spot-trophy' : 'spot-trophy is-alone'}>
            <Icon name="trophy" />
          </span>
        </span>
        <b className="round-title">{props.name} wins!</b>
        <span className="round-sub">
          Champion! Final score {Math.max(a, b)} to {Math.min(a, b)}
        </span>
      </div>
    );
  }
  const points = FINISH_POINTS[props.finish];
  return (
    <div className={`spotlight side-${props.side}`} role="status">
      <span className="spot-rays" aria-hidden="true" />
      <span className="round-kicker">Round {props.round}</span>
      <span className="spot-pic">
        <BeyPicture bey={props.bey} spin />
        <span className="spot-finish">
          <Icon name={FINISH_ICON[props.finish]} />
        </span>
      </span>
      <b className="round-title">{FINISH_LABELS[props.finish]}!</b>
      <span className="round-sub">
        <span className="side-text">{props.name}</span> gets {points} {points === 1 ? 'point' : 'points'}
      </span>
    </div>
  );
}

const FACE_OFF_STATS = [
  { key: 'attack', label: 'Attack', icon: 'bolt' },
  { key: 'defense', label: 'Defense', icon: 'shield' },
  { key: 'stamina', label: 'Stamina', icon: 'battery' },
] as const;

/** Tug-of-war bars for the two Beys' stats, and which type has the edge. */
export function FaceOff({ beys }: { beys: [Bey, Bey] }) {
  const f = [fighterFrom(beys[0]), fighterFrom(beys[1])];
  const edge = typeEdge(beys[0].type, beys[1].type);
  const types = [TYPE_INFO[beys[0].type], TYPE_INFO[beys[1].type]];

  let edgeText: ReactNode;
  if (edge !== null) {
    const loser = (1 - edge) as 0 | 1;
    edgeText = (
      <>
        <Icon name={types[edge].icon} />
        <span>
          {types[edge].label} beats {types[loser].label}! <b className={`side-text side-${edge}`}>{SIDE_NAMES[edge]}</b> has the edge.
        </span>
      </>
    );
  } else if (beys[0].type === beys[1].type) {
    edgeText = (
      <>
        <Icon name={types[0].icon} />
        <span>Both are {types[0].label} types. A fair fight!</span>
      </>
    );
  } else {
    edgeText = (
      <>
        <Icon name="yin" />
        <span>No type has the edge. Anyone can win!</span>
      </>
    );
  }

  return (
    <section className="faceoff" aria-labelledby="faceoff-title">
      <h2 className="faceoff-title" id="faceoff-title">
        Who's stronger?
      </h2>
      {FACE_OFF_STATS.map(({ key, label, icon }) => {
        const a = f[0][key];
        const b = f[1][key];
        const share = a + b > 0 ? (a / (a + b)) * 100 : 50;
        const lead = a === b ? null : a > b ? 0 : 1;
        return (
          <div key={key} className="tug" role="img" aria-label={`${label}: Red ${a}, Blue ${b}`}>
            <span className={`tug-num side-0${lead === 0 ? ' is-ahead' : ''}`}>{a}</span>
            <span className="tug-label">
              <Icon name={icon} />
              {label}
            </span>
            <span className={`tug-num side-1${lead === 1 ? ' is-ahead' : ''}`}>{b}</span>
            <span className="tug-bar" style={{ '--share': `${share}%` } as CSSProperties}>
              <span className="tug-knot" />
            </span>
          </div>
        );
      })}
      <p className="edge">{edgeText}</p>
    </section>
  );
}

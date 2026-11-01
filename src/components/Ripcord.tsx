import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import type { Bey } from '../data/types';
import { SUPER_LAUNCH } from '../data/battle';
import { BeyPicture } from './BeyPicture';
import { SIDE_NAMES } from './BattleBits';
import { Icon } from './Icon';
import { playCount } from '../lib/sound';

/** Pull speeds in screen widths per second: this slow is a weak rip, this fast is a Super Launch. */
export const SLOW_PULL = 0.5;
export const FAST_PULL = 3.5;
/** A pull shorter than this share of the screen width doesn't count. */
const MIN_PULL = 0.12;
/** Speed is measured over the fastest stretch at least this long, so one jumpy sample can't fake a fast pull. */
const SPEED_WINDOW_MS = 50;
/** The result stays up this long before the next launch or the battle. */
const RESULT_MS = 900;
/** A keyboard launch is an ordinary good rip. */
const KEYBOARD_POWER = 1;

export interface Sample {
  t: number;
  x: number;
  y: number;
}

/** Launch power from pull speed (screen widths per second): 0.9 for a slow pull up to 1.1 for a fast one. */
export function pullPower(speed: number): number {
  const share = Math.min(1, Math.max(0, (speed - SLOW_PULL) / (FAST_PULL - SLOW_PULL)));
  return Math.round((0.9 + 0.2 * share) * 1000) / 1000;
}

/**
 * The fastest the finger moved, in pixels per millisecond, over any stretch of at least
 * SPEED_WINDOW_MS. A flick quicker than that altogether is measured end to end.
 */
export function peakSpeed(samples: Sample[]): number {
  if (samples.length < 2) return 0;
  const first = samples[0];
  const last = samples[samples.length - 1];
  const total = last.t - first.t;
  if (total <= 0) return 0;
  if (total < SPEED_WINDOW_MS) return Math.hypot(last.x - first.x, last.y - first.y) / total;
  let peak = 0;
  for (let i = 1; i < samples.length; i++) {
    for (let j = i - 1; j >= 0; j--) {
      const dt = samples[i].t - samples[j].t;
      if (dt < SPEED_WINDOW_MS) continue;
      peak = Math.max(peak, Math.hypot(samples[i].x - samples[j].x, samples[i].y - samples[j].y) / dt);
      break;
    }
  }
  return peak;
}

export type LaunchGrade = 'super' | 'great' | 'good' | 'weak';

export function launchGrade(power: number): LaunchGrade {
  if (power >= SUPER_LAUNCH) return 'super';
  if (power >= 1) return 'great';
  if (power >= 0.95) return 'good';
  return 'weak';
}

export const LAUNCH_LABELS: Record<LaunchGrade, string> = { super: 'Super Launch!', great: 'Great rip!', good: 'Good rip', weak: 'Weak rip...' };

export function launchLabel(power: number): string {
  return LAUNCH_LABELS[launchGrade(power)];
}

/** How long one turn of the launched Bey takes on screen: a Super Launch spins about three times as fast as a weak rip. */
export function spinSeconds(power: number): number {
  return Math.round((0.35 + ((1.1 - power) / 0.2) * 0.75) * 100) / 100;
}

interface Props {
  beys: [Bey, Bey];
  names: [string, string];
  onDone: (launch: [number, number]) => void;
}

/**
 * Each side launches its Bey in turn, Red then Blue, by pulling a ripcord: drag anywhere across the
 * panel and let go. The faster the pull, the faster the Bey spins. Enter or Space launches an ordinary rip.
 */
export function Ripcord({ beys, names, onDone }: Props) {
  const [side, setSide] = useState<0 | 1>(0);
  const [power, setPower] = useState<number | null>(null);
  const [pulling, setPulling] = useState(false);
  const [tooShort, setTooShort] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const pic = useRef<HTMLSpanElement>(null);
  const grip = useRef<HTMLSpanElement>(null);
  const cord = useRef<HTMLSpanElement>(null);
  const gauge = useRef<HTMLSpanElement>(null);
  const samples = useRef<Sample[]>([]);
  const locked = useRef(false);
  const launches = useRef<[number, number]>([1, 1]);
  const timer = useRef<number | undefined>(undefined);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const width = () => panel.current?.clientWidth || window.innerWidth || 390;

  /** Draw the cord from the Bey's rim to the finger, and the gauge at the fastest pull so far. */
  const draw = (x: number, y: number) => {
    const box = panel.current?.getBoundingClientRect();
    const bey = pic.current?.getBoundingClientRect();
    if (!box) return;
    const cx = bey ? bey.left + bey.width / 2 - box.left : box.width / 2;
    const cy = bey ? bey.top + bey.height / 2 - box.top : box.height / 2;
    // The photo has clear margins; the Bey itself fills about 85% of it.
    const rim = bey ? bey.width * 0.42 : 0;
    const dist = Math.hypot(x - cx, y - cy);
    const angle = Math.atan2(y - cy, x - cx);
    if (grip.current) grip.current.style.transform = `translate(${x}px, ${y}px)`;
    if (cord.current) {
      cord.current.style.transform = `translate(${cx + Math.cos(angle) * rim}px, ${cy + Math.sin(angle) * rim}px) rotate(${angle}rad)`;
      cord.current.style.width = `${Math.max(0, dist - rim)}px`;
    }
    if (gauge.current) {
      const speed = (peakSpeed(samples.current) * 1000) / width();
      gauge.current.style.left = `${Math.min(1, Math.max(0, (speed - SLOW_PULL) / (FAST_PULL - SLOW_PULL))) * 100}%`;
    }
  };

  // At rest the handle sits just right of the Bey, with a short cord, showing where to pull.
  useLayoutEffect(() => {
    if (power !== null || pulling) return;
    const box = panel.current?.getBoundingClientRect();
    const bey = pic.current?.getBoundingClientRect();
    if (!box || !bey) return;
    draw(bey.left + bey.width / 2 - box.left + Math.min(box.width * 0.36, bey.width * 1.05), bey.top + bey.height / 2 - box.top);
    // The rest pose only depends on which side is up and on the layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side, power, pulling]);

  const finish = (result: number) => {
    locked.current = true;
    launches.current[side] = result;
    setPulling(false);
    setPower(result);
    playCount(result >= SUPER_LAUNCH);
    timer.current = window.setTimeout(() => {
      if (side === 0) {
        setSide(1);
        setPower(null);
        locked.current = false;
      } else {
        done.current([launches.current[0], launches.current[1]]);
      }
    }, RESULT_MS);
  };

  const point = (e: PointerEvent<HTMLDivElement>): Sample | null => {
    const box = panel.current?.getBoundingClientRect();
    return box ? { t: performance.now(), x: e.clientX - box.left, y: e.clientY - box.top } : null;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (locked.current) return;
    const p = point(e);
    if (!p) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Older browsers: the pull still works while the finger stays on the panel.
    }
    samples.current = [p];
    setTooShort(false);
    setPulling(true);
    draw(p.x, p.y);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (locked.current || !samples.current.length) return;
    const p = point(e);
    if (!p) return;
    samples.current.push(p);
    draw(p.x, p.y);
  };

  const onPointerUp = () => {
    if (locked.current || !samples.current.length) return;
    const pull = samples.current;
    samples.current = [];
    const first = pull[0];
    const last = pull[pull.length - 1];
    if (Math.hypot(last.x - first.x, last.y - first.y) < MIN_PULL * width()) {
      setPulling(false);
      setTooShort(true);
      return;
    }
    finish(pullPower((peakSpeed(pull) * 1000) / width()));
  };

  const onPointerCancel = () => {
    samples.current = [];
    setPulling(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (locked.current || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    finish(KEYBOARD_POWER);
  };

  const grade = power === null ? null : launchGrade(power);
  const className = ['launch', 'ripcord', `side-${side}`, pulling && 'is-pulling', grade && 'is-launched', grade && `is-${grade}`].filter(Boolean).join(' ');
  const spinStyle = power === null ? undefined : ({ '--rev': `${spinSeconds(power)}s` } as CSSProperties);

  return (
    <div className="launcher">
      <div
        ref={panel}
        className={className}
        role="button"
        tabIndex={0}
        aria-label={`Launch the ${SIDE_NAMES[side].toLowerCase()} Bey`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onKeyDown={onKeyDown}
      >
        <span className="launch-head">
          <span className="side-label">{SIDE_NAMES[side]}</span>
          <span className="launch-name">{names[side]}</span>
        </span>
        <span className="launch-pic" ref={pic} style={spinStyle}>
          <BeyPicture bey={beys[side]} spin={power !== null} />
        </span>
        <span className="cord" ref={cord} aria-hidden="true" />
        <span className="grip" ref={grip} aria-hidden="true">
          <Icon name="dash" />
        </span>
        <span className="launch-track gauge" aria-hidden="true">
          <span className="gauge-cover" ref={gauge} />
        </span>
        <span className="launch-ends" aria-hidden="true">
          <span>Slow</span>
          <span>Fast</span>
          <span>Super</span>
        </span>
        {grade === null ? (
          <span className={tooShort ? 'launch-cue is-short' : 'launch-cue'}>
            <Icon name="dash" />
            {tooShort ? 'Pull it further!' : 'Pull the ripcord!'}
          </span>
        ) : (
          <span className="launch-result">{LAUNCH_LABELS[grade]}</span>
        )}
      </div>
      <p className="visually-hidden" role="status">
        {grade === null ? `${SIDE_NAMES[side]}: pull to launch ${names[side]}` : `${SIDE_NAMES[side]}: ${LAUNCH_LABELS[grade]}`}
      </p>
      <p className="battle-rule">Swipe fast across the Bey, like pulling a ripcord. The faster the pull, the faster it spins!</p>
    </div>
  );
}

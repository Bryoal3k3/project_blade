import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Bey } from '../data/types';
import { FINISH_LABELS, FINISH_POINTS, fighterFrom, type BattleResult } from '../data/battle';
import { PHOTOS } from './BeyPicture';
import { BeyPicture } from './BeyPicture';
import { playClack, playFinish } from '../lib/sound';

/** One simulated moment lasts this long on screen. */
const TICK_MS = 140;
const COUNTDOWN = ['3', '2', '1', 'Let it rip!'];
const COUNT_MS = 650;
const FINISH_MS = 2000;
/** Bey size as a share of the stadium's width; positions are in stadium radii from the centre. */
const BEY_SIZE = 0.24;
const TOUCH = BEY_SIZE;

type Point = [number, number];
interface Step {
  at: [Point, Point];
  energy: [number, number];
  hit: boolean;
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Where each Bey is at every moment: attackers roam wide, stamina types hug the middle, dashes ride the rail. */
export function battlePath(beys: [Bey, Bey], result: BattleResult): Step[] {
  const aggression = beys.map((bey) => {
    const f = fighterFrom(bey);
    return Math.min(1, (f.attack / 150) * 0.6 + (f.dash / 100) * 0.6);
  });
  const angle = [Math.PI, 0];
  const phase = [0, 1.7];
  return result.ticks.map((tick, k) => {
    const at = [0, 1].map((i) => {
      const dir = beys[i].spin === 'left' ? -1 : 1;
      angle[i] += dir * (0.18 + 0.28 * aggression[i]) * (tick.dash === i ? 3 : 1);
      const r = tick.dash === i ? 0.8 : 0.14 + 0.44 * aggression[i] * (0.5 + 0.5 * Math.sin(k * 0.33 + phase[i]));
      return [r * Math.cos(angle[i]), r * Math.sin(angle[i])] as Point;
    }) as [Point, Point];
    if (tick.hit) {
      const mid: Point = [(at[0][0] + at[1][0]) / 2, (at[0][1] + at[1][1]) / 2];
      let dx = at[1][0] - at[0][0];
      let dy = at[1][1] - at[0][1];
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      at[0] = [mid[0] - dx * TOUCH, mid[1] - dy * TOUCH];
      at[1] = [mid[0] + dx * TOUCH, mid[1] + dy * TOUCH];
    }
    return { at, energy: tick.energy, hit: tick.hit };
  });
}

const ease = (t: number) => t * t * (3 - 2 * t);

interface Props {
  beys: [Bey, Bey];
  names: [string, string];
  result: BattleResult;
  onDone: () => void;
}

/** Plays a simulated round: countdown, the two Beys circling and clashing, then the finish. */
export function BattleArena({ beys, names, result, onDone }: Props) {
  const arena = useRef<HTMLDivElement>(null);
  const beyEls = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const meters = [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)];
  const spark = useRef<HTMLDivElement>(null);
  const pieces = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  const [count, setCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const steps = useMemo(() => battlePath(beys, result), [beys, result]);

  useEffect(() => {
    if (prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
      done.current();
      return;
    }
    const loser = result.winner === null ? null : ((1 - result.winner) as 0 | 1);
    const spinDir = beys.map((bey) => (bey.spin === 'left' ? -1 : 1));
    const turn = [0, 0];
    let lastHit = -1;
    let lastCount = 0;
    let finishStarted = false;
    let last = performance.now();
    const start = last;
    let frame = 0;

    const place = (i: 0 | 1, [x, y]: Point, extra = '', opacity = 1) => {
      const el = beyEls[i].current;
      const box = arena.current;
      if (!el || !box) return;
      const R = box.clientWidth / 2;
      const size = box.clientWidth * BEY_SIZE;
      el.style.transform = `translate(${R + x * R - size / 2}px, ${R + y * R - size / 2}px) rotate(${turn[i]}deg) ${extra}`;
      el.style.opacity = String(opacity);
    };
    const flashAt = (el: HTMLElement | null, [x, y]: Point) => {
      const box = arena.current;
      if (!el || !box) return;
      const R = box.clientWidth / 2;
      el.style.left = `${R + x * R}px`;
      el.style.top = `${R + y * R}px`;
      el.classList.remove('go');
      void el.offsetWidth;
      el.classList.add('go');
    };

    const loop = (now: number) => {
      const dt = Math.min(50, now - last) / 1000;
      last = now;
      const t = now - start;
      const countdownMs = COUNT_MS * COUNTDOWN.length;

      if (t < countdownMs) {
        const c = Math.floor(t / COUNT_MS);
        if (c !== lastCount) {
          lastCount = c;
          setCount(c);
        }
        place(0, [-0.55, 0]);
        place(1, [0.55, 0]);
        frame = requestAnimationFrame(loop);
        return;
      }
      if (lastCount < COUNTDOWN.length) {
        lastCount = COUNTDOWN.length;
        setCount(COUNTDOWN.length);
      }

      const k = (t - countdownMs) / TICK_MS;
      const lastStep = steps.length - 1;
      if (k < lastStep) {
        const i0 = Math.floor(k);
        const f = ease(k - i0);
        const a = steps[i0];
        const b = steps[i0 + 1];
        for (const i of [0, 1] as const) {
          const energy = a.energy[i] + (b.energy[i] - a.energy[i]) * f;
          turn[i] += spinDir[i] * dt * 1100 * Math.max(0.1, Math.min(1.3, energy / 100));
          place(i, [a.at[i][0] + (b.at[i][0] - a.at[i][0]) * f, a.at[i][1] + (b.at[i][1] - a.at[i][1]) * f]);
          if (meters[i].current) meters[i].current.style.width = `${Math.max(0, Math.min(100, energy))}%`;
        }
        if (b.hit && i0 + 1 !== lastHit && f > 0.8) {
          lastHit = i0 + 1;
          flashAt(spark.current, [(b.at[0][0] + b.at[1][0]) / 2, (b.at[0][1] + b.at[1][1]) / 2]);
          arena.current?.classList.remove('shake');
          void arena.current?.offsetWidth;
          arena.current?.classList.add('shake');
          playClack();
        }
        frame = requestAnimationFrame(loop);
        return;
      }

      // The finish.
      const ft = t - countdownMs - lastStep * TICK_MS;
      if (!finishStarted) {
        finishStarted = true;
        setFinished(true);
        playFinish();
        if (result.finish === 'burst' && loser !== null) flashAt(pieces.current, steps[lastStep].at[loser]);
        else if (result.finish !== 'spin' && loser !== null) flashAt(spark.current, steps[lastStep].at[loser]);
      }
      const end = steps[lastStep];
      for (const i of [0, 1] as const) {
        const isLoser = i === loser || result.winner === null;
        const from = end.at[i];
        if (!isLoser) {
          turn[i] += spinDir[i] * dt * 900;
          place(i, [from[0] * (1 - Math.min(1, ft / 900) * 0.6), from[1] * (1 - Math.min(1, ft / 900) * 0.6)]);
          continue;
        }
        if (result.finish === 'over' || result.finish === 'xtreme') {
          const p = Math.min(1, ft / (result.finish === 'xtreme' ? 380 : 550));
          const target: Point = result.finish === 'xtreme' ? [0, 1.45] : [from[0] >= 0 ? 1.45 : -1.45, from[1] * 0.4];
          turn[i] += spinDir[i] * dt * 700;
          place(i, [from[0] + (target[0] - from[0]) * p * p, from[1] + (target[1] - from[1]) * p * p], '', 1 - p);
        } else if (result.finish === 'burst') {
          place(i, from, '', 0);
        } else {
          // Spin finish (or a draw): slow down, wobble, and tip over.
          const slow = Math.max(0, 1 - ft / 1200);
          turn[i] += spinDir[i] * dt * 700 * slow;
          const wobble = Math.sin(ft / 55) * 0.035 * slow;
          place(i, [from[0] + wobble, from[1] + wobble * 0.6], slow === 0 ? 'scale(1, 0.82)' : '');
        }
      }
      if (ft < FINISH_MS) {
        frame = requestAnimationFrame(loop);
        return;
      }
      done.current();
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
    // The round plays once; a new round mounts a new arena.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loserBey = result.winner === null ? undefined : beys[1 - result.winner];
  const burstParts: ReactNode[] = loserBey
    ? [
        <BeyPicture key="blade" bey={loserBey} />,
        ...(loserBey.ratchet?.photo && PHOTOS[`parts/${loserBey.ratchet.photo}`] ? [<img key="ratchet" src={PHOTOS[`parts/${loserBey.ratchet.photo}`]} alt="" />] : []),
        ...(loserBey.bit.photo && PHOTOS[`parts/${loserBey.bit.photo}`] ? [<img key="bit" src={PHOTOS[`parts/${loserBey.bit.photo}`]} alt="" />] : []),
      ]
    : [];

  return (
    <div className="battle">
      <div className="arena" ref={arena}>
        <div className="arena-rail" />
        <span className="pocket pocket-left" />
        <span className="pocket pocket-right" />
        <span className="pocket pocket-xtreme" />
        {[0, 1].map((i) => (
          <div key={i} className={`arena-bey side-${i}`} ref={beyEls[i]}>
            <BeyPicture bey={beys[i]} />
          </div>
        ))}
        <div className="spark" ref={spark} />
        <div className="burst-pieces" ref={pieces}>
          {burstParts.map((part, i) => (
            <span key={i} className={`burst-piece piece-${i}`}>
              {part}
            </span>
          ))}
        </div>
        {count < COUNTDOWN.length && (
          <div className="countdown" key={count}>
            {COUNTDOWN[count]}
          </div>
        )}
        {finished && (
          <div className="finish-banner" role="status">
            {result.finish && result.winner !== null ? (
              <>
                <b>{FINISH_LABELS[result.finish]}!</b>
                <span>
                  {names[result.winner]} +{FINISH_POINTS[result.finish]}
                </span>
              </>
            ) : (
              <b>Draw!</b>
            )}
          </div>
        )}
      </div>
      <div className="meters">
        {[0, 1].map((i) => (
          <div key={i} className={`meter side-${i}`}>
            <span className="meter-name">{names[i]}</span>
            <span className="meter-track">
              <span className="meter-fill" ref={meters[i]} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

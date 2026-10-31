import type { CSSProperties } from 'react';
import type { Bey, PartKey, StatKey } from '../data/types';
import { BIT_INFO, BIT_STAT_KEYS, BIT_TYPE_INFO, HEIGHT_STEPS, PART_INFO, PART_STAT_KEYS, STAT_INFO, STAT_MAX } from '../data/meta';
import { displayName, heightStep, parseRatchet } from '../data';
import { BeyArt } from './BeyArt';
import { partPhoto } from './BeyPicture';
import { Icon } from './Icon';

export function statKeys(part: PartKey): StatKey[] {
  return part === 'bit' ? BIT_STAT_KEYS : PART_STAT_KEYS;
}

/** How full a bar is, as a percentage, using the box's scale for that part. */
export function barPercent(part: PartKey, value: number): number {
  return Math.min(100, Math.round((value / STAT_MAX[part]) * 1000) / 10);
}

/** The panel label printed on the box. */
export function partLabel(bey: Bey, part: PartKey): string {
  if (part === 'blade' && bey.blade.integratedRatchet) return 'Ratchet-Integrated Blade';
  return PART_INFO[part].label;
}

export function partTitle(bey: Bey, part: PartKey): string {
  if (part === 'blade') return displayName(bey);
  if (part === 'ratchet') return bey.ratchet?.name ?? '';
  return bey.bit.code;
}

export function bitDescription(bey: Bey): string {
  return BIT_INFO[bey.bit.code] ?? (bey.bit.type ? BIT_TYPE_INFO[bey.bit.type] : '');
}

function partWhat(bey: Bey, part: PartKey): string {
  if (part === 'blade') {
    return bey.blade.integratedRatchet ? `${PART_INFO.blade.what} Its ratchet is built in.` : PART_INFO.blade.what;
  }
  if (part === 'bit') return `${PART_INFO.bit.what} ${bitDescription(bey)}`.trim();
  const { points, height } = parseRatchet(bey.ratchet?.name ?? '');
  return `${PART_INFO.ratchet.what} ${bey.ratchet?.name} means ${points} ${points === 1 ? 'point' : 'points'}, ${(height / 10).toFixed(1)} mm tall.`;
}

function StatBar({ part, stat, value }: { part: PartKey; stat: StatKey; value: number }) {
  const info = STAT_INFO[stat];
  return (
    <li className="bar">
      <span className="bar-label">
        <Icon name={info.icon} />
        {info.label}
      </span>
      <span className="bar-value">{value}</span>
      <span className="bar-track" aria-hidden="true">
        <span className="bar-fill" style={{ '--fill': `${barPercent(part, value)}%` } as CSSProperties} />
      </span>
    </li>
  );
}

function HeightBar({ height }: { height: number }) {
  const lit = heightStep(height);
  return (
    <li className="bar">
      <span className="bar-label">
        <Icon name="height" />
        Height
      </span>
      <span className="bar-value">{height}</span>
      <span className="height-steps" aria-hidden="true">
        {HEIGHT_STEPS.map((step, i) => (
          <b key={step} className={i + 1 === lit ? 'on' : undefined} />
        ))}
      </span>
    </li>
  );
}

/** One part laid out like its panel on the back of the box: name, picture and stat bars. */
export function PartSection({ bey, part, onSpeak }: { bey: Bey; part: PartKey; onSpeak?: () => void }) {
  const stats = bey[part]?.stats as Partial<Record<StatKey, number>> | undefined;
  const photo = partPhoto(bey, part);
  const picture = photo ? (
    <img src={photo} alt="" draggable={false} />
  ) : part === 'blade' ? (
    <BeyArt bey={bey} />
  ) : null;
  const titleId = `part-${part}`;
  const pieces = part === 'blade' ? bey.blade.pieces : undefined;

  return (
    <section className="part" aria-labelledby={titleId}>
      <div className="part-top">
        <div className="part-titles">
          <span className="part-kind">{partLabel(bey, part)}</span>
          <h2 className="part-name" id={titleId}>
            {partTitle(bey, part)}
            {part === 'bit' && <span className="part-sub">{bey.bit.name}</span>}
          </h2>
        </div>
        {onSpeak && (
          <button type="button" className="icon-btn icon-btn-small" aria-label={`Read the ${part} stats`} onClick={onSpeak}>
            <Icon name="speaker" />
          </button>
        )}
      </div>
      <div className={picture ? 'part-body has-pic' : 'part-body'}>
        {picture && <div className="part-pic">{picture}</div>}
        <div className="part-stats">
          {!stats && (
            <div className="stats-soon">
              <b>Stats coming soon</b>
              <span>They get copied from the box.</span>
            </div>
          )}
          {(stats || part === 'ratchet') && (
            <ul className="bars">
              {stats && statKeys(part).map((key) => <StatBar key={key} part={part} stat={key} value={stats[key] ?? 0} />)}
              {part === 'ratchet' && <HeightBar height={parseRatchet(bey.ratchet?.name ?? '').height} />}
            </ul>
          )}
        </div>
      </div>
      {pieces && (
        <ul className="pieces" aria-label="Blade pieces">
          {pieces.map((piece) => (
            <li key={piece.label}>
              <span className="piece-label">{piece.label}</span>
              <span className="piece-name">{piece.name}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="part-what">{partWhat(bey, part)}</p>
    </section>
  );
}

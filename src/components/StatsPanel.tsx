import type { CSSProperties } from 'react';
import type { Bey, PartKey, StatKey } from '../data/types';
import { BIT_STAT_KEYS, PART_INFO, PART_STAT_KEYS, STAT_INFO, STAT_MAX } from '../data/meta';
import { Icon } from './Icon';

const PARTS: PartKey[] = ['blade', 'ratchet', 'bit'];

export function partTitle(bey: Bey, part: PartKey): string {
  if (part === 'blade') return bey.blade.name;
  if (part === 'ratchet') return bey.ratchet.name;
  return `${bey.bit.code} · ${bey.bit.name}`;
}

export function statKeys(part: PartKey): StatKey[] {
  return part === 'bit' ? BIT_STAT_KEYS : PART_STAT_KEYS;
}

function StatBar({ stat, value }: { stat: StatKey; value: number }) {
  const info = STAT_INFO[stat];
  const lit = Math.round((value / STAT_MAX) * 10);
  return (
    <li className="bar" style={{ '--sc': info.color } as CSSProperties} aria-label={`${info.label} ${value} out of ${STAT_MAX}`}>
      <span className="bar-icon">
        <Icon name={info.icon} />
      </span>
      <span className="bar-label">{info.label}</span>
      <span className="bar-value">{value}</span>
      <span className="bar-track" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <b key={i} className={i < lit ? 'on' : undefined} />
        ))}
      </span>
    </li>
  );
}

export function StatsPanel({ bey, part, onPart }: { bey: Bey; part: PartKey; onPart: (part: PartKey) => void }) {
  const current = bey[part];
  const stats = current.stats as Partial<Record<StatKey, number>> | undefined;

  return (
    <section className="stats" aria-label="Stats">
      <div className="part-tabs" role="tablist" aria-label="Part">
        {PARTS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`tab-${key}`}
            aria-selected={key === part}
            aria-controls="part-panel"
            className="part-tab"
            onClick={() => onPart(key)}
          >
            {PART_INFO[key].label}
          </button>
        ))}
      </div>
      <div className="part-panel" id="part-panel" role="tabpanel" aria-labelledby={`tab-${part}`}>
        <div className="part-head">
          <span>{partTitle(bey, part)}</span>
          {current.weight !== undefined && <span className="part-weight">{current.weight.toFixed(1)} g</span>}
        </div>
        <p className="part-what">{PART_INFO[part].what}</p>
        {stats ? (
          <ul className="bars">
            {statKeys(part).map((key) => (
              <StatBar key={key} stat={key} value={stats[key] ?? 0} />
            ))}
          </ul>
        ) : (
          <div className="stats-soon">
            <b>Stats coming soon</b>
            <span>They get copied from the box.</span>
          </div>
        )}
      </div>
    </section>
  );
}

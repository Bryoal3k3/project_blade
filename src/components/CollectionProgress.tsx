import type { CSSProperties } from 'react';
import type { Bey } from '../data/types';
import { badges, collectionCount } from '../data/badges';
import { Icon } from './Icon';

/** "12 of 161 Beys" and the badges for the collection, builds and battles. */
export function CollectionProgress({ mine, builds, matches }: { mine: Bey[]; builds: number; matches: number }) {
  const { have, total } = collectionCount(mine);
  const list = badges({ mine, builds, matches });
  const earned = list.filter((b) => b.earned).length;
  return (
    <section className="progress" aria-labelledby="progress-title">
      <div className="progress-head">
        <h2 id="progress-title" className="progress-title">
          {have} of {total} Beys
        </h2>
        <span className="progress-badges">
          {earned} of {list.length} badges
        </span>
      </div>
      <span className="bar-track" aria-hidden="true">
        <span className="bar-fill" style={{ '--fill': `${(have / total) * 100}%` } as CSSProperties} />
      </span>
      <ul className="badges">
        {list.map((badge) => (
          <li key={badge.id} className={badge.earned ? 'badge is-earned' : 'badge'}>
            <span className="badge-icon">
              <Icon name={badge.icon} />
            </span>
            <span className="badge-label">{badge.label}</span>
            <span className="badge-how">{badge.earned ? 'Earned!' : badge.how}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

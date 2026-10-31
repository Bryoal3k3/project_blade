import { useMemo, useState } from 'react';
import type { Bey } from '../data/types';
import { BEYS, comboName, displayName, findBey } from '../data';
import { choiceFromPicks, fusedBey } from '../data/builder';
import type { SavedBuild } from '../hooks/useSaved';
import { BeyPicture } from './BeyPicture';
import { Icon } from './Icon';
import { TypeChips, typeVars, type TypeFilter } from './TypeChips';

/** A Bey chosen for a battle: a real one by id, or a saved build. */
export type FighterRef = { kind: 'bey'; id: string } | { kind: 'build'; id: string };

export interface ResolvedFighter {
  ref: FighterRef;
  name: string;
  combo: string;
  bey: Bey;
}

export function resolveFighter(ref: FighterRef | undefined, builds: SavedBuild[]): ResolvedFighter | undefined {
  if (!ref) return undefined;
  if (ref.kind === 'bey') {
    const bey = findBey(ref.id);
    return bey && { ref, name: displayName(bey), combo: comboName(bey), bey };
  }
  const build = builds.find((b) => b.id === ref.id);
  const choice = build && choiceFromPicks(build.picks);
  if (!build || !choice) return undefined;
  const bey = fusedBey(choice);
  return { ref, name: build.name, combo: comboName(bey), bey };
}

function Option({ fighter, onPick }: { fighter: ResolvedFighter; onPick: (ref: FighterRef) => void }) {
  return (
    <button type="button" className="pick" style={typeVars(fighter.bey.type)} onClick={() => onPick(fighter.ref)}>
      <span className="pick-stage">
        <BeyPicture bey={fighter.bey} />
      </span>
      <span className="pick-name">{fighter.name}</span>
      <span className="pick-sub">
        <span className={`line-chip line-${fighter.bey.line.toLowerCase()}`}>{fighter.bey.line}</span>
        <span className="pick-note">{fighter.combo}</span>
      </span>
    </button>
  );
}

interface Props {
  title: string;
  builds: SavedBuild[];
  mine: string[];
  onPick: (ref: FighterRef) => void;
  onClose: () => void;
}

/** Choose a Bey: saved builds first, then My Beys, then every Bey. */
export function FighterPicker({ title, builds, mine, onPick, onClose }: Props) {
  const [filter, setFilter] = useState<TypeFilter>('all');
  const built = useMemo(() => builds.flatMap((b) => resolveFighter({ kind: 'build', id: b.id }, builds) ?? []), [builds]);
  const owned = useMemo(() => mine.flatMap((id) => resolveFighter({ kind: 'bey', id }, builds) ?? []), [mine, builds]);
  const all = useMemo(
    () => BEYS.filter((bey) => filter === 'all' || bey.type === filter).map((bey) => resolveFighter({ kind: 'bey', id: bey.id }, builds)!),
    [filter, builds],
  );

  return (
    <section className="picker fighter-picker" aria-labelledby="fighter-picker-title">
      <div className="picker-head">
        <h2 className="picker-title" id="fighter-picker-title">
          {title}
        </h2>
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
          <Icon name="back" />
        </button>
      </div>
      {built.length > 0 && (
        <>
          <h3 className="shelf-title">My Builds</h3>
          <div className="shelf">
            {built.map((f) => (
              <Option key={f.ref.id} fighter={f} onPick={onPick} />
            ))}
          </div>
        </>
      )}
      {owned.length > 0 && (
        <>
          <h3 className="shelf-title">My Beys</h3>
          <div className="shelf">
            {owned.map((f) => (
              <Option key={f.ref.id} fighter={f} onPick={onPick} />
            ))}
          </div>
        </>
      )}
      <h3 className="shelf-title">All Beys</h3>
      <TypeChips value={filter} onChange={setFilter} />
      <div className="grid">
        {all.map((f) => (
          <Option key={f.ref.id} fighter={f} onPick={onPick} />
        ))}
      </div>
    </section>
  );
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Bey, PartKey } from '../data/types';
import { BIT_INFO, PART_INFO, SET_INFO, STAT_INFO, TYPE_INFO } from '../data/meta';
import { comboName, parseRatchet, totalWeight } from '../data';
import type { Collection } from '../hooks/useCollection';
import { canSpeak, speak } from '../lib/speak';
import { BeyPicture } from '../components/BeyPicture';
import { Icon } from '../components/Icon';
import { StatsPanel, statKeys } from '../components/StatsPanel';
import { typeVars } from '../components/TypeChips';

function useToast(): [string | null, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const show = (next: string) => {
    setMessage(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(null), 2400);
  };
  return [message, show];
}

/** What the read-aloud button says for the part on screen. */
export function spokenText(bey: Bey, part: PartKey): string {
  const [points, height] = bey.ratchet.name.split('-');
  const intro = `${bey.name}, ${points} ${height} ${bey.bit.name}. ${TYPE_INFO[bey.type].label} type.`;
  const stats = bey[part].stats as Record<string, number> | undefined;
  if (!stats) return `${intro} Stats coming soon.`;
  const list = statKeys(part)
    .map((key) => `${STAT_INFO[key].label} ${stats[key]}`)
    .join(', ');
  return `${intro} ${PART_INFO[part].label} stats: ${list}.`;
}

interface Props {
  bey: Bey;
  backHref: string;
  collection: Collection;
}

export function BeyPage({ bey, backHref, collection }: Props) {
  const [part, setPart] = useState<PartKey>('blade');
  const [toast, showToast] = useToast();
  const type = TYPE_INFO[bey.type];
  const combo = comboName(bey);
  const have = collection.has('mine', bey.id);
  const want = collection.has('wish', bey.id);
  const weight = totalWeight(bey);
  const { points, heightMm } = parseRatchet(bey.ratchet.name);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const toggleHave = () => {
    collection.toggle('mine', bey.id);
    showToast(have ? 'Taken out of My Beys' : 'Added to My Beys');
  };
  const toggleWant = () => {
    collection.toggle('wish', bey.id);
    showToast(want ? 'Taken off the wish list' : 'Added to the wish list');
  };

  return (
    <main className="bey-screen" style={typeVars(bey.type)}>
      <div className="bey-inner">
        <div className="topbar">
          <a className="icon-btn" href={backHref} aria-label="Back">
            <Icon name="back" />
          </a>
          <span className="code-chip">{bey.code}</span>
          <span className="spacer" />
          {canSpeak() && (
            <button type="button" className="icon-btn" aria-label="Read out loud" onClick={() => speak(spokenText(bey, part))}>
              <Icon name="speaker" />
            </button>
          )}
          <button type="button" className="icon-btn star-btn" aria-label="I have it" aria-pressed={have} onClick={toggleHave}>
            <Icon name="star" />
          </button>
          <button type="button" className="icon-btn heart-btn" aria-label="I want it" aria-pressed={want} onClick={toggleWant}>
            <Icon name="heart" />
          </button>
        </div>

        <div className="stage">
          <BeyPicture bey={bey} spin />
        </div>

        <div className="bey-id">
          <span className="type-badge">
            <Icon name={type.icon} />
            <span>{type.label}</span>
          </span>
          <h1 className="bey-name">{bey.name}</h1>
          <span className="bey-combo">{combo}</span>
          {bey.hasbroName && <span className="bey-alt">On Hasbro boxes: {bey.hasbroName}</span>}
        </div>

        <StatsPanel bey={bey} part={part} onPart={setPart} />

        <div className="facts">
          <div className="fact">
            <span className="fact-label">{bey.set}</span>
            <span className="fact-value">{SET_INFO[bey.set]}</span>
          </div>
          <div className="fact">
            <span className="fact-label">Spins</span>
            <span className="fact-value fact-spin">
              <Icon name="spin" className={bey.spin === 'left' ? 'flip' : undefined} />
              {bey.spin === 'left' ? 'Left' : 'Right'}
            </span>
          </div>
          {weight !== undefined && (
            <div className="fact">
              <span className="fact-label">Weight</span>
              <span className="fact-value">{weight.toFixed(1)} g</span>
            </div>
          )}
        </div>

        <section className="decode" aria-labelledby="decode-title">
          <h2 id="decode-title">What {combo} means</h2>
          <div className="decode-row">
            <span className="decode-key">{bey.ratchet.name}</span>
            <span className="decode-text">
              Ratchet with {points} {points === 1 ? 'point' : 'points'}, {heightMm.toFixed(1)} mm tall.
            </span>
          </div>
          <div className="decode-row">
            <span className="decode-key">{bey.bit.code}</span>
            <span className="decode-text">
              {bey.bit.name}: {BIT_INFO[bey.bit.code]}
            </span>
          </div>
        </section>
      </div>
      <div className="toast" role="status" hidden={!toast}>
        {toast}
      </div>
    </main>
  );
}

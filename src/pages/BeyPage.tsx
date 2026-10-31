import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Bey } from '../data/types';
import { SET_INFO, TYPE_INFO } from '../data/meta';
import { comboName, displayName, otherName, packOnly, partsOf, releaseLabel, releaseStatus, totalWeight } from '../data';
import type { Collection } from '../hooks/useCollection';
import { SpinStage } from '../components/SpinStage';
import { Icon } from '../components/Icon';
import { PartSection } from '../components/PartSection';
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

interface Props {
  bey: Bey;
  backHref: string;
  collection: Collection;
}

export function BeyPage({ bey, backHref, collection }: Props) {
  const [toast, showToast] = useToast();
  const type = TYPE_INFO[bey.type];
  const name = displayName(bey);
  const alsoCalled = otherName(bey);
  const have = collection.has('mine', bey.id);
  const want = collection.has('wish', bey.id);
  const weight = totalWeight(bey);
  const status = releaseStatus(bey);

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
          <span className={`code-chip line-chip line-${bey.line.toLowerCase()}`}>{bey.line}</span>
          <span className="spacer" />
          <button type="button" className="icon-btn star-btn" aria-label="I have it" aria-pressed={have} onClick={toggleHave}>
            <Icon name="star" />
          </button>
          <button type="button" className="icon-btn heart-btn" aria-label="I want it" aria-pressed={want} onClick={toggleWant}>
            <Icon name="heart" />
          </button>
        </div>

        <SpinStage bey={bey} />

        <div className="bey-id">
          <span className="type-badge">
            <Icon name={type.icon} />
            <span>{type.label} type</span>
          </span>
          <h1 className="bey-name">{name}</h1>
          <span className="bey-combo">{comboName(bey)}</span>
          {alsoCalled && <span className="bey-alt">Takara Tomy name: {alsoCalled}</span>}
        </div>

        <div className={`facts facts-${2 + Number(weight !== undefined) + Number(Boolean(bey.released))}`}>
          <div className="fact">
            <span className="fact-label">Spins</span>
            <span className="fact-value fact-spin">
              <Icon name="spin" className={bey.spin === 'left' ? 'flip' : undefined} />
              {bey.spin === 'left' ? 'Left' : 'Right'}
            </span>
          </div>
          <div className="fact">
            <span className="fact-label">{bey.set}</span>
            <span className="fact-value">{SET_INFO[bey.set]}</span>
          </div>
          {weight !== undefined && (
            <div className="fact">
              <span className="fact-label">Weight</span>
              <span className="fact-value">{weight.toFixed(1)} g</span>
            </div>
          )}
          {bey.released && (
            <div className="fact">
              <span className="fact-label">{status === 'soon' ? 'Coming' : 'In stores'}</span>
              <span className="fact-value">{releaseLabel(bey.released)}</span>
            </div>
          )}
        </div>

        {bey.packs && (
          <p className="packs-note">
            <Icon name="box" />
            <span>
              {packOnly(bey) ? 'Comes in the ' : 'Also in the '}
              {bey.packs.join(' and the ')}
            </span>
          </p>
        )}

        {partsOf(bey).map((part) => (
          <PartSection key={part} bey={bey} part={part} />
        ))}
      </div>
      <div className="toast" role="status" hidden={!toast}>
        {toast}
      </div>
    </main>
  );
}

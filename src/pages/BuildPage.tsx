import { useLayoutEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { BeyType, PartKey, PartStats } from '../data/types';
import { PART_INFO, SET_INFO, STAT_MAX, TYPE_INFO } from '../data/meta';
import { comboName, displayName, partsOf } from '../data';
import {
  BIT_OPTIONS,
  BLADE_OPTIONS,
  RATCHET_OPTIONS,
  type BitOption,
  type BladeOption,
  type Choice,
  type RatchetOption,
  findOption,
  fusedBey,
  fusedTotals,
  neededParts,
  shoppingList,
} from '../data/builder';
import type { Collection } from '../hooks/useCollection';
import { useBuild } from '../hooks/useBuild';
import { canSpeak, speak } from '../lib/speak';
import { playFuseSound } from '../lib/sound';
import { BeyPicture, PHOTOS } from '../components/BeyPicture';
import { FuseAnimation } from '../components/FuseAnimation';
import { Icon } from '../components/Icon';
import { PartSection } from '../components/PartSection';
import { SpinStage } from '../components/SpinStage';
import { TypeChips, typeVars, type TypeFilter } from '../components/TypeChips';
import { spokenPart } from './BeyPage';

/** The biggest a fused total can be: a full blade, ratchet and bit. */
const TOTAL_MAX = STAT_MAX.blade + STAT_MAX.ratchet + STAT_MAX.bit;

const PICK_TITLES: Record<PartKey, string> = { blade: 'Pick a blade', ratchet: 'Pick a ratchet', bit: 'Pick a bit' };

function partPicture(photo: string | undefined, alt = ''): ReactNode {
  const src = photo ? PHOTOS[`parts/${photo}`] : undefined;
  return src ? <img src={src} alt={alt} draggable={false} loading="lazy" /> : <span className="part-blank" aria-hidden="true" />;
}

function MiniStats({ stats }: { stats?: PartStats }) {
  if (!stats) return <span className="mini-stats">Stats soon</span>;
  return (
    <span className="mini-stats" aria-label={`Attack ${stats.attack}, Defense ${stats.defense}, Stamina ${stats.stamina}`}>
      <span>
        <Icon name="bolt" />
        {stats.attack}
      </span>
      <span>
        <Icon name="shield" />
        {stats.defense}
      </span>
      <span>
        <Icon name="battery" />
        {stats.stamina}
      </span>
    </span>
  );
}

function Picker({ part, picked, onPick }: { part: PartKey; picked?: string; onPick: (key: string) => void }) {
  const [filter, setFilter] = useState<TypeFilter>('all');

  const tiles = useMemo(() => {
    if (part === 'blade') {
      return BLADE_OPTIONS.filter((o) => filter === 'all' || o.type === filter).map((o: BladeOption) => ({
        key: o.key,
        type: o.type as BeyType | undefined,
        picture: <BeyPicture bey={o.picture} />,
        name: o.name,
        sub: (
          <>
            <span className={`line-chip line-${o.line.toLowerCase()}`}>{o.line}</span>
            {o.blade.integratedRatchet && <span className="pick-note">Ratchet built in</span>}
          </>
        ),
        stats: o.blade.stats,
      }));
    }
    if (part === 'ratchet') {
      return RATCHET_OPTIONS.map((o: RatchetOption) => ({
        key: o.key,
        type: undefined,
        picture: partPicture(o.ratchet.photo),
        name: o.key,
        sub: <span className="pick-note">Height {o.key.split('-')[1]}</span>,
        stats: o.ratchet.stats,
      }));
    }
    return BIT_OPTIONS.filter((o) => filter === 'all' || o.bit.type === filter).map((o: BitOption) => ({
      key: o.key,
      type: o.bit.type,
      picture: partPicture(o.bit.photo),
      name: o.key,
      sub: <span className="pick-note">{o.bit.name}</span>,
      stats: o.bit.stats,
    }));
  }, [part, filter]);

  return (
    <section className="picker" aria-labelledby="picker-title">
      <h2 className="picker-title" id="picker-title">
        {PICK_TITLES[part]}
      </h2>
      {part !== 'ratchet' && <TypeChips value={filter} onChange={setFilter} />}
      <div className="grid">
        {tiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            className="pick"
            aria-pressed={picked === tile.key}
            style={tile.type ? typeVars(tile.type) : undefined}
            onClick={() => onPick(tile.key)}
          >
            <span className="pick-stage">{tile.picture}</span>
            <span className="pick-name">{tile.name}</span>
            <span className="pick-sub">{tile.sub}</span>
            <MiniStats stats={tile.stats} />
          </button>
        ))}
      </div>
    </section>
  );
}

function Slot({ part, label, picture, name, active, disabled, onClick }: {
  part: PartKey;
  label: string;
  picture?: ReactNode;
  name?: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="slot" aria-current={active ? 'step' : undefined} disabled={disabled} onClick={onClick} data-part={part}>
      <span className="slot-pic">{picture ?? <span className="slot-empty">?</span>}</span>
      <span className="slot-label">{label}</span>
      <span className="slot-name">{name ?? 'Tap to pick'}</span>
    </button>
  );
}

function TotalBars({ choice }: { choice: Choice }) {
  const totals = fusedTotals(choice);
  const rows: [keyof PartStats, string, 'bolt' | 'shield' | 'battery'][] = [
    ['attack', 'Attack', 'bolt'],
    ['defense', 'Defense', 'shield'],
    ['stamina', 'Stamina', 'battery'],
  ];
  return (
    <section className="totals" aria-labelledby="totals-title">
      <h2 className="totals-title" id="totals-title">
        Total power
      </h2>
      <ul className="bars">
        {rows.map(([key, label, icon]) => (
          <li className="bar" key={key}>
            <span className="bar-label">
              <Icon name={icon} />
              {label}
            </span>
            <span className="bar-value">{totals[key]}</span>
            <span className="bar-track" aria-hidden="true">
              <span className="bar-fill" style={{ '--fill': `${Math.min(100, (totals[key] / TOTAL_MAX) * 100)}%` } as CSSProperties} />
            </span>
          </li>
        ))}
      </ul>
      {!totals.complete && <p className="totals-note">One of these parts doesn't have stats yet, so the totals are missing a piece.</p>}
    </section>
  );
}

function joinParts(parts: PartKey[]): string {
  const names = parts.map((p) => PART_INFO[p].label.toLowerCase());
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
}

function ShoppingList({ choice, collection }: { choice: Choice; collection: Collection }) {
  const items = useMemo(() => shoppingList(choice, collection.lists.mine), [choice, collection.lists.mine]);
  const buying = items.filter((item) => item.source.kind === 'buy');
  const total = buying.reduce((sum, item) => sum + (item.source.price ?? 0), 0);
  const unpriced = buying.some((item) => item.source.price === undefined);
  const allWished = buying.every((item) => collection.has('wish', item.bey.id) || collection.has('mine', item.bey.id));

  const wishAll = () => {
    for (const item of buying) {
      if (!collection.has('wish', item.bey.id) && !collection.has('mine', item.bey.id)) collection.toggle('wish', item.bey.id);
    }
  };

  return (
    <section className="shop" aria-labelledby="shop-title">
      <h2 className="shop-title" id="shop-title">
        What you need
      </h2>
      <ul className="shop-list">
        {items.map((item) => {
          const have = item.source.kind === 'have';
          return (
            <li key={item.source.id} className={have ? 'shop-item is-have' : 'shop-item'}>
              <a className="shop-pic" href={`#/bey/${item.bey.id}`} aria-label={`See ${displayName(item.bey)}`}>
                <BeyPicture bey={item.bey} />
              </a>
              <div className="shop-text">
                <span className="shop-kind">{have ? 'You have it!' : `${item.source.set} · ${SET_INFO[item.source.set]}`}</span>
                <b className="shop-name">{item.source.label}</b>
                <span className="shop-gives">Gives you the {joinParts(item.gives)}</span>
              </div>
              <span className="shop-price">
                {have ? <Icon name="check" /> : item.source.price !== undefined ? `$${item.source.price.toFixed(2)}` : ''}
              </span>
            </li>
          );
        })}
      </ul>
      {buying.length > 0 && (
        <>
          <p className="shop-total">
            {total > 0
              ? `About $${total.toFixed(2)} in Canadian list prices${unpriced ? ', plus the one without a price' : ''}.`
              : 'Prices for these aren’t known yet.'}
          </p>
          <button type="button" className="big-btn ghost" onClick={wishAll} disabled={allWished}>
            <Icon name="heart" />
            {allWished ? 'On your wish list' : 'Add to my wish list'}
          </button>
        </>
      )}
      {buying.length === 0 && <p className="shop-total">You already have everything you need. Go build it!</p>}
    </section>
  );
}

function Result({ choice, collection, onChange, onAgain }: { choice: Choice; collection: Collection; onChange: () => void; onAgain: () => void }) {
  const bey = fusedBey(choice);
  const type = TYPE_INFO[bey.type];
  const talk = canSpeak();
  const sayIt = () => {
    const parts = partsOf(bey).map((part) => spokenPart(bey, part)).join(' ');
    speak(`Your new Bey is ${displayName(bey)} ${comboName(bey).replace('-', ' ')}. ${type.label} type. ${parts}`);
  };

  return (
    <div className="result" style={typeVars(bey.type)}>
      <div className="result-head">
        <span className="result-eyebrow">Your new Bey</span>
        {talk && (
          <button type="button" className="icon-btn" aria-label="Read out loud" onClick={sayIt}>
            <Icon name="speaker" />
          </button>
        )}
      </div>
      <SpinStage bey={bey} />
      <div className="bey-id">
        <span className="type-badge">
          <Icon name={type.icon} />
          <span>{type.label} type</span>
        </span>
        <h2 className="bey-name">{displayName(bey)}</h2>
        <span className="bey-combo">{comboName(bey)}</span>
      </div>
      <TotalBars choice={choice} />
      {partsOf(bey).map((part) => (
        <PartSection key={part} bey={bey} part={part} onSpeak={talk ? () => speak(spokenPart(bey, part)) : undefined} />
      ))}
      <ShoppingList choice={choice} collection={collection} />
      <div className="result-actions">
        <button type="button" className="big-btn ghost" onClick={onChange}>
          Change parts
        </button>
        <button type="button" className="big-btn" onClick={onAgain}>
          Build another
        </button>
      </div>
    </div>
  );
}

export function BuildPage({ collection }: { collection: Collection }) {
  const build = useBuild();
  const [editing, setEditing] = useState<PartKey | null>(null);
  const [fusing, setFusing] = useState(false);

  const blade = findOption(BLADE_OPTIONS, build.picks.blade);
  const ratchet = findOption(RATCHET_OPTIONS, build.picks.ratchet);
  const bit = findOption(BIT_OPTIONS, build.picks.bit);
  const needed: PartKey[] = blade ? neededParts({ blade }) : ['blade', 'ratchet', 'bit'];
  const chosen: Record<PartKey, unknown> = { blade, ratchet, bit };
  const missing = needed.find((part) => !chosen[part]);
  const choice: Choice | undefined = blade && bit && (ratchet || !needed.includes('ratchet')) ? { blade, ratchet, bit } : undefined;
  const step: PartKey | 'ready' | 'fusing' | 'done' = fusing ? 'fusing' : editing ?? missing ?? (build.fused ? 'done' : 'ready');

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const onPick = (part: PartKey) => (key: string) => {
    build.pick(part, key);
    setEditing(null);
  };

  const fuse = () => {
    playFuseSound();
    setFusing(true);
  };

  const bladePicture = blade ? <BeyPicture bey={blade.picture} /> : undefined;
  const integrated = Boolean(blade?.blade.integratedRatchet);

  return (
    <main className="page build-page">
      <header className="list-head">
        <span className="app-label">Project Blade</span>
        <h1 className="list-title">Build a Bey!</h1>
        <span className="list-count">Pick a blade, a ratchet and a bit. Then fuse them!</span>
      </header>

      {step !== 'fusing' && step !== 'done' && (
        <div className="slots" role="group" aria-label="Your parts">
          <Slot part="blade" label="Blade" picture={bladePicture} name={blade?.name} active={step === 'blade'} onClick={() => setEditing('blade')} />
          <Slot
            part="ratchet"
            label="Ratchet"
            picture={integrated ? <span className="slot-empty">✓</span> : ratchet ? partPicture(ratchet.ratchet.photo) : undefined}
            name={integrated ? 'Built in' : ratchet?.key}
            active={step === 'ratchet'}
            disabled={integrated}
            onClick={() => setEditing('ratchet')}
          />
          <Slot part="bit" label="Bit" picture={bit ? partPicture(bit.bit.photo) : undefined} name={bit ? `${bit.key} ${bit.bit.name}` : undefined} active={step === 'bit'} onClick={() => setEditing('bit')} />
        </div>
      )}

      {(step === 'blade' || step === 'ratchet' || step === 'bit') && (
        <Picker key={step} part={step} picked={build.picks[step]} onPick={onPick(step)} />
      )}

      {step === 'ready' && choice && (
        <section className="ready">
          <p className="ready-text">{needed.length === 3 ? 'All three parts are picked.' : 'Both parts are picked.'} Ready?</p>
          <button type="button" className="fuse-btn" onClick={fuse}>
            Fuse!
          </button>
          <button type="button" className="big-btn ghost" onClick={build.reset}>
            Start over
          </button>
        </section>
      )}

      {step === 'fusing' && choice && (
        <FuseAnimation
          blade={bladePicture}
          ratchet={integrated ? undefined : partPicture(choice.ratchet?.ratchet.photo)}
          bit={partPicture(choice.bit.bit.photo)}
          onDone={() => {
            setFusing(false);
            build.setFused(true);
          }}
        />
      )}

      {step === 'done' && choice && (
        <Result
          choice={choice}
          collection={collection}
          onChange={() => build.setFused(false)}
          onAgain={() => {
            build.reset();
            setEditing(null);
          }}
        />
      )}
    </main>
  );
}

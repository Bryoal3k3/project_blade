import type { CSSProperties } from 'react';
import { BEY_TYPES, type BeyType } from '../data/types';
import { TYPE_INFO } from '../data/meta';
import { Icon } from './Icon';

export type TypeFilter = BeyType | 'all';

export function typeVars(type: BeyType): CSSProperties {
  return { '--tc': TYPE_INFO[type].color, '--tci': TYPE_INFO[type].ink } as CSSProperties;
}

export function TypeChips({ value, onChange }: { value: TypeFilter; onChange: (next: TypeFilter) => void }) {
  return (
    <div className="chips" role="group" aria-label="Show one type">
      <button type="button" className="chip" aria-pressed={value === 'all'} onClick={() => onChange('all')}>
        All
      </button>
      {BEY_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          className="chip"
          style={typeVars(type)}
          aria-pressed={value === type}
          onClick={() => onChange(value === type ? 'all' : type)}
        >
          <Icon name={TYPE_INFO[type].icon} />
          {TYPE_INFO[type].label}
        </button>
      ))}
    </div>
  );
}

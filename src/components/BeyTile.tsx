import type { Bey } from '../data/types';
import { TYPE_INFO } from '../data/meta';
import { comboName, displayName, releaseStatus } from '../data';
import { BeyPicture } from './BeyPicture';
import { Icon } from './Icon';
import { typeVars } from './TypeChips';

interface Props {
  bey: Bey;
  have: boolean;
  want: boolean;
  onOpen: () => void;
}

export function BeyTile({ bey, have, want, onOpen }: Props) {
  const type = TYPE_INFO[bey.type];
  const status = releaseStatus(bey);
  return (
    <a
      className="tile"
      href={`#/bey/${bey.id}`}
      style={typeVars(bey.type)}
      onClick={onOpen}
      aria-label={`${displayName(bey)} ${comboName(bey)}, ${type.label} type`}
    >
      <span className="tile-stage">
        <BeyPicture bey={bey} spin />
      </span>
      {status && <span className={`tile-badge is-${status}`}>{status === 'new' ? 'New' : 'Soon'}</span>}
      <span className="tile-name">{displayName(bey)}</span>
      <span className="tile-row">
        <span className="tile-meta">
          <span className={`line-chip line-${bey.line.toLowerCase()}`}>{bey.line}</span>
          <span className="tile-combo">{comboName(bey)}</span>
        </span>
        <span className="tile-type">
          <Icon name={type.icon} />
        </span>
      </span>
      {(have || want) && (
        <span className="tile-marks">
          {have && (
            <span className="mark mark-star">
              <Icon name="star" />
            </span>
          )}
          {want && (
            <span className="mark mark-heart">
              <Icon name="heart" />
            </span>
          )}
        </span>
      )}
    </a>
  );
}

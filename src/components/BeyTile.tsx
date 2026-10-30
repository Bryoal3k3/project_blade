import type { Bey } from '../data/types';
import { TYPE_INFO } from '../data/meta';
import { comboName } from '../data';
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
  return (
    <a
      className="tile"
      href={`#/bey/${bey.id}`}
      style={typeVars(bey.type)}
      onClick={onOpen}
      aria-label={`${bey.name} ${comboName(bey)}, ${type.label} type`}
    >
      <span className="tile-stage">
        <BeyPicture bey={bey} spin />
      </span>
      <span className="tile-name">{bey.name}</span>
      <span className="tile-row">
        <span className="tile-combo">{comboName(bey)}</span>
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

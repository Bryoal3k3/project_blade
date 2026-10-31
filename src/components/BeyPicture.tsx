import type { Bey, PartKey } from '../data/types';
import { BeyArt } from './BeyArt';

// Pictures are picked up automatically from src/photos:
// <bey id>.webp (or .jpg/.png) for each Bey, and parts/<photo>.webp for ratchets and bits.
const files = import.meta.glob<string>('../photos/**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const PHOTOS: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.replace('../photos/', '').replace(/\.[^.]+$/, '').toLowerCase(), url]),
);

/** A picture of one part. The blade uses the Bey's main photo. */
export function partPhoto(bey: Bey, part: PartKey): string | undefined {
  if (part === 'blade') return PHOTOS[`${bey.id}.blade`] ?? PHOTOS[bey.id];
  const shared = bey[part]?.photo;
  return (shared && PHOTOS[`parts/${shared}`]) ?? PHOTOS[`${bey.id}.${part}`];
}

/** The Bey's photo when there is one, otherwise its drawn stand-in. */
export function BeyPicture({ bey, spin = false }: { bey: Bey; spin?: boolean }) {
  const photo = PHOTOS[bey.id];
  const spinning = spin && (!photo || bey.photoSpins);
  const className = ['bey-pic', spinning && 'is-spinning', bey.spin === 'left' && 'is-left'].filter(Boolean).join(' ');

  if (photo) return <img className={className} src={photo} alt="" draggable={false} />;
  return <BeyArt bey={bey} className={className} />;
}

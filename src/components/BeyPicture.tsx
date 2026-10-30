import type { Bey, PartKey } from '../data/types';
import { BeyArt } from './BeyArt';

// Any photo in src/photos named after a Bey's id is picked up automatically:
// dran-sword.jpg for the Bey, dran-sword.ratchet.jpg and dran-sword.bit.jpg for its parts.
const files = import.meta.glob<string>('../photos/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const PHOTOS: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace(/\.[^.]+$/, '').toLowerCase(), url]),
);

/** A photo of one part. The blade falls back to the Bey's main photo. */
export function partPhoto(bey: Bey, part: PartKey): string | undefined {
  return PHOTOS[`${bey.id}.${part}`] ?? (part === 'blade' ? PHOTOS[bey.id] : undefined);
}

/** The Bey's photo when there is one, otherwise its drawn stand-in. */
export function BeyPicture({ bey, spin = false }: { bey: Bey; spin?: boolean }) {
  const photo = PHOTOS[bey.id];
  const spinning = spin && (!photo || bey.photoSpins);
  const className = ['bey-pic', spinning && 'is-spinning', bey.spin === 'left' && 'is-left'].filter(Boolean).join(' ');

  if (photo) return <img className={className} src={photo} alt="" draggable={false} />;
  return <BeyArt bey={bey} className={className} />;
}

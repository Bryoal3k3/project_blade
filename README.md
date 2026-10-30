# Project Blade

An app for my son to browse current Beyblade X tops with their pictures and stats.

It runs in the phone's browser and can be added to the home screen like a normal app (iPhone and Android). After the first visit it works without Wi-Fi.

## What it does

- **Browse**: every Bey in a grid, with big buttons to show only Attack, Defense, Stamina or Balance types.
- **Bey page**: the Bey spinning in a stadium, its type, its combo (like `3-60F`), and stats for the Blade, Ratchet and Bit, the same way the box lists them.
- **Read to me**: the speaker button reads the name and stats out loud.
- **My Beys and Wish list**: tap the star for Beys you have and the heart for Beys you want. Saved on the device.

## Run it

```sh
npm install
npm run dev        # add --host to open it from a phone on the same Wi-Fi
npm test           # checks the Bey data and the screens
npm run build      # makes the finished app in dist/
```

## Adding or updating a Bey

All Beys live in [`src/data/beys.json`](src/data/beys.json). The easiest way to add one is a photo of the back of its box: the stats are printed there for each part. Here is Rudder Phoenix, copied from its Hasbro box:

```json
{
  "id": "rudder-phoenix",
  "names": { "hasbro": "Rudder Phoenix" },
  "line": "UX",
  "set": "Starter",
  "type": "attack",
  "spin": "right",
  "statsFrom": "Hasbro",
  "blade": { "stats": { "attack": 15, "defense": 40, "stamina": 60 } },
  "ratchet": { "name": "4-70", "stats": { "attack": 11, "defense": 12, "stamina": 7 } },
  "bit": { "code": "LF", "name": "Low Flat",
           "stats": { "attack": 45, "defense": 5, "stamina": 10, "dash": 40, "burstResistance": 80 } },
  "photoSpins": true,
  "art": { "shape": "blade", "blades": 7, "accent": "#C9CED8" }
}
```

- `names`: `hasbro` and/or `takaraTomy`. The app shows the Hasbro name first, since that is what Canadian stores sell.
- `line` is `BX`, `UX` or `CX` (the logo on the box). `code` (like `BX-01`) is the Takara Tomy product number; Hasbro boxes don't print one, so leave it out.
- `type` is `attack`, `defense`, `stamina` or `balance`. `set` is `Starter`, `Booster`, `Random Booster` or `Deck Set`.
- `stats` are copied exactly from the box. Blade and bit numbers go up to 100, ratchet numbers up to 32. The ratchet's height comes from its name (4-70 is 70). Set `statsFrom` to `Hasbro` or `Takara Tomy` to say whose box they came from. Until a part has stats, its page shows "Stats coming soon".
- `weight` (grams) can be added to any part when known.
- A new bit letter also needs a one-line description in `BIT_INFO` in [`src/data/meta.ts`](src/data/meta.ts).
- `art` controls the drawn stand-in picture used until a real photo is added.

Run `npm test` after editing. It lists anything that is missing or mistyped.

## Adding photos

Put photos in [`src/photos`](src/photos) named after the Bey's `id`: `rudder-phoenix.webp` for the Bey, plus `rudder-phoenix.ratchet.webp` and `rudder-phoenix.bit.webp` for its parts if you have them. The app uses them automatically. See [`src/photos/README.md`](src/photos/README.md).

Official product photos belong to Takara Tomy and Hasbro (the Rudder Phoenix pictures are cut from its box). Photos you take yourself are the safest choice if the app is ever public.

## Putting it on a phone

The app has to be hosted somewhere first. Because this repo is private, the free options are [Netlify](https://www.netlify.com/) or [Cloudflare Pages](https://pages.cloudflare.com/): connect the repo, set the build command to `npm run build` and the output folder to `dist`. (GitHub Pages also works, but needs a paid GitHub plan for private repos.)

Then open the site on the phone and:

- **iPhone**: in Safari, tap Share, then **Add to Home Screen**.
- **Android**: in Chrome, tap the menu, then **Install app** or **Add to Home screen**.

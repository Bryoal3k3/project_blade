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

All Beys live in [`src/data/beys.json`](src/data/beys.json). Each entry looks like this:

```json
{
  "id": "dran-sword",
  "code": "BX-01",
  "name": "Dran Sword",
  "hasbroName": "Sword Dran",
  "set": "Starter",
  "type": "attack",
  "spin": "right",
  "blade": { "name": "Dran Sword", "weight": 33.0, "stats": { "attack": 60, "defense": 20, "stamina": 20 } },
  "ratchet": { "name": "3-60", "weight": 6.2, "stats": { "attack": 15, "defense": 15, "stamina": 10 } },
  "bit": { "code": "F", "name": "Flat", "weight": 2.1,
           "stats": { "attack": 40, "defense": 15, "stamina": 10, "dash": 35, "burstResistance": 30 } },
  "art": { "shape": "blade", "blades": 3, "accent": "#FFC24B" }
}
```

(The numbers above only show the format.)

- `name` is the Takara Tomy name. `hasbroName` is optional, for when Hasbro boxes use a different name.
- `type` is `attack`, `defense`, `stamina` or `balance`. `set` is `Starter`, `Booster`, `Random Booster` or `Deck Set`.
- `weight` and `stats` are optional. Leave them out until they are copied from the box; the page shows "Stats coming soon" until then.
- A new bit letter also needs a one-line description in `BIT_INFO` in [`src/data/meta.ts`](src/data/meta.ts).
- `art` controls the drawn stand-in picture used until a real photo is added.

Run `npm test` after editing. It lists anything that is missing or mistyped.

## Adding photos

Put a photo in [`src/photos`](src/photos) named after the Bey's `id`, for example `src/photos/dran-sword.jpg`. The app uses it automatically in place of the drawing. See [`src/photos/README.md`](src/photos/README.md).

Official product photos belong to Takara Tomy and Hasbro. Photos you take yourself are the safest choice if the app is ever public.

## Putting it on a phone

The app has to be hosted somewhere first. Because this repo is private, the free options are [Netlify](https://www.netlify.com/) or [Cloudflare Pages](https://pages.cloudflare.com/): connect the repo, set the build command to `npm run build` and the output folder to `dist`. (GitHub Pages also works, but needs a paid GitHub plan for private repos.)

Then open the site on the phone and:

- **iPhone**: in Safari, tap Share, then **Add to Home Screen**.
- **Android**: in Chrome, tap the menu, then **Install app** or **Add to Home screen**.

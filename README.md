# Project Blade

An app for my son to browse current Beyblade X tops with their pictures and stats.

It runs in the phone's browser and can be added to the home screen like a normal app (iPhone and Android). After the first visit it works without Wi-Fi.

## What it does

- **Browse**: every Hasbro Beyblade X in a grid, newest first, with big buttons to show only Attack, Defense, Stamina or Balance types. New releases get a "New" badge and upcoming ones a "Soon" badge.
- **Bey page**: the Bey spinning in a stadium, its type, its combo (like `4-70LF`), and stats for the Blade, Ratchet and Bit laid out like the back of the box.
- **Read to me**: the speaker button reads the name and stats out loud.
- **My Beys and Wish list**: tap the star for Beys you have and the heart for Beys you want. Saved on the device.

## Run it

```sh
npm install
npm run dev        # add --host to open it from a phone on the same Wi-Fi
npm test           # checks the Bey data and the screens
npm run build      # makes the finished app in dist/
```

## Where the Beys come from

The app lists every Beyblade X that Hasbro sells on its own (Starter Packs, Booster Packs and the X-Over Beys). They are imported from the [Beyblade fan wiki](https://beyblade.fandom.com/wiki/List_of_Beyblade_X_products_(Hasbro)): names, parts, stats, release dates and pictures.

```sh
npm run import            # refresh src/data/beys.json and download new pictures
npm run import -- --force # re-download every picture
```

Run it when new Beys come out, then `npm test` and commit the changes. The import needs internet access to `beyblade.fandom.com` and `static.wikia.nocookie.net`.

### Stats from a real box win

The wiki's stats match the Hasbro boxes almost everywhere, but not always (Rudder Phoenix's blade is 15/40/60 on its box and 10/35/55 on the wiki), and brand-new Beys can be missing some. Numbers read from a Hasbro box go in [`scripts/box-stats.json`](scripts/box-stats.json), keyed by the Bey's id, and the import uses them instead of the wiki's:

```json
{
  "rudder-phoenix-4-70lf": {
    "blade": { "attack": 15, "defense": 40, "stamina": 60 }
  }
}
```

The import prints any Bey that is still missing stats. Until a part has stats, its page shows "Stats coming soon".

### How the box's numbers are shown

- Blade and bit bars go up to 100, ratchet bars up to 32. Some ratchets use halves, like 8.5.
- Custom Line (CX) boxes print one blade total: the Primary/Metal/Over blade plus the Auxiliary blade. The app adds them up the same way and lists the pieces underneath.
- A Ratchet-Integrated Blade has its ratchet built in, so there is no ratchet panel.
- The ratchet's height comes from its name (4-70 is 70).

## Pictures

Pictures live in [`src/photos`](src/photos): `<bey id>.webp` for each Bey, and `parts/` for ratchets and bits. The import downloads them and removes their backgrounds. Any picture you drop in with the same name replaces it; see [`src/photos/README.md`](src/photos/README.md).

The pictures belong to Takara Tomy and Hasbro. That is fine for a family app; keep the site private or unlisted rather than public.

## Putting it on a phone

The app has to be hosted somewhere first. Because this repo is private, the free options are [Netlify](https://www.netlify.com/) or [Cloudflare Pages](https://pages.cloudflare.com/): connect the repo, set the build command to `npm run build` and the output folder to `dist`. (GitHub Pages also works, but needs a paid GitHub plan for private repos.)

Then open the site on the phone and:

- **iPhone**: in Safari, tap Share, then **Add to Home Screen**.
- **Android**: in Chrome, tap the menu, then **Install app** or **Add to Home screen**.

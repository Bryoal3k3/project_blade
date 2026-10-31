# Project Blade

An app for my son to browse current Beyblade X tops with their pictures and stats.

It runs in the phone's browser and can be added to the home screen like a normal app (iPhone and Android). After the first visit it works without Wi-Fi.

## What it does

- **Browse**: every Hasbro Beyblade X (including the ones in Dual Packs and Multipacks) in a grid, newest first, with big buttons to show only Attack, Defense, Stamina or Balance types. New releases get a "New" badge and upcoming ones a "Soon" badge.
- **Bey page**: the Bey spinning in a stadium, its type, its combo (like `4-70LF`), and stats for the Blade, Ratchet and Bit laid out like the back of the box.
- **My Beys and Wish list**: tap the star for Beys you have and the heart for Beys you want. Saved on the device.
- **Build a Bey**: pick any Blade, Ratchet and Bit Hasbro sells, press Fuse, and watch them lock together. The new Bey gets its added-up stats and type, plus a shopping list with the fewest boxes to buy (skipping parts from Beys in My Beys) and their Canadian list prices. Every Beyblade X part fits every other; a Ratchet-Integrated Blade just needs a bit.
- **My Builds**: give a built Bey a name and save it to a shelf on the Build screen. Saved builds can battle too.
- **Battle**: pick two Beys (real ones or saved builds), or let Random Beys choose, and press Let it rip. Each round is worked out from their real stats and types (Attack beats Stamina, Stamina beats Defense, Defense beats Attack), but like a real battle it has ups and downs: every launch is a little stronger or weaker, every crash has a winner, and the battle goes in pushes where one Bey takes over and then the other fights back. Better stats win more often, never always. The round plays out in the stadium and ends in a Spin, Over, Burst or Xtreme Finish. First to 4 points wins the match.
- **Keep score**: for real battles. Tap the finish for each round (Spin 1, Over 2, Burst 2, Xtreme 3) and the app announces the winner at 4 points.
- **Badges**: My Beys shows how many of the Beys are collected and badges for milestones, builds and battles.

## Run it

```sh
npm install
npm run dev        # add --host to open it from a phone on the same Wi-Fi
npm test           # checks the Bey data and the screens
npm run build      # makes the finished app in dist/
```

## Where the Beys come from

The app lists every Beyblade X that Hasbro sells in Canada or the US: Starter Packs, Booster Packs and the X-Over Beys, plus the Beys that come in Dual Packs, Multipack Sets (Marvel, Star Wars, Transformers, Jurassic World and more), team packs, Battle Sets and deluxe launcher sets. A Bey's page says which pack it comes in. `src/data/packs.json` lists every pack with its Beys and price, for the Build a Bey shopping list. They are imported from the [Beyblade fan wiki](https://beyblade.fandom.com/wiki/List_of_Beyblade_X_products_(Hasbro)): names, parts, stats, release dates and pictures.

```sh
npm run import            # refresh src/data/beys.json and download new pictures
npm run import -- --force # re-download every picture
```

This runs by itself every Monday ([`.github/workflows/update-beys.yml`](.github/workflows/update-beys.yml)): it imports, runs the tests, builds, commits to `main` and publishes. It can also be started by hand from the repo's **Actions** tab. If the tests fail, nothing is published and GitHub emails the repo owner. The Beys page shows the date of the last check. To run the import yourself, it needs internet access to `beyblade.fandom.com` and `static.wikia.nocookie.net`.

### Stats from a real box win

The wiki's stats match the Hasbro boxes almost everywhere, but not always (Rudder Phoenix's blade is 15/40/60 on its box and 10/35/55 on the wiki), and brand-new Beys can be missing some. Numbers read from a Hasbro box go in [`scripts/box-stats.json`](scripts/box-stats.json), keyed by the Bey's id, and the import uses them instead of the wiki's:

```json
{
  "rudder-phoenix-4-70lf": {
    "blade": { "attack": 15, "defense": 40, "stamina": 60 }
  }
}
```

A reading can also cover one part everywhere it appears, like `"ratchet:2-60"`. The import prints any Bey that is still missing stats. Until a part has stats, its page shows "Stats coming soon".

### How the box's numbers are shown

- Blade and bit bars go up to 100, ratchet bars up to 32. Some ratchets use halves, like 8.5.
- Custom Line (CX) boxes print one blade total: the Primary/Metal/Over blade plus the Auxiliary blade. The app adds them up the same way and lists the pieces underneath.
- A Ratchet-Integrated Blade has its ratchet built in, so there is no ratchet panel.
- The ratchet's height comes from its name (4-70 is 70).

## Pictures

Pictures live in [`src/photos`](src/photos): `<bey id>.webp` for each Bey, and `parts/` for ratchets and bits. The import downloads them and removes their backgrounds. Any picture you drop in with the same name replaces it; see [`src/photos/README.md`](src/photos/README.md).

The pictures belong to Takara Tomy and Hasbro and come from the fan wiki. They are here for a family app, not to sell or redistribute.

## Putting it on a phone

The app is hosted on GitHub Pages at **https://bryoal3k3.github.io/project_blade/**. Every push to `main` rebuilds and publishes it ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

One-time setup: in the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.

Then open the site on the phone and:

- **iPhone**: in Safari, tap Share, then **Add to Home Screen**.
- **Android**: in Chrome, tap the menu, then **Install app** or **Add to Home screen**.

After the first visit it works without Wi-Fi, and it updates itself the next time it opens after a new version is published.

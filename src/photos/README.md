# Bey pictures

- `<bey id>.webp`: the Bey itself, e.g. `rudder-phoenix-4-70lf.webp`. Shown big at the top of its page, on its tile, and next to the blade stats.
- `parts/ratchet-<name>.webp` and `parts/bit-<name>.webp`: ratchets and bits, shared by every Bey that uses them. Each Bey's entry in `src/data/beys.json` names its part pictures in `photo`.

`npm run import` downloads these from the Beyblade wiki. To use your own photo instead, save it here with the same name (`.jpg`, `.png` and `.webp` all work) and delete the old one. Square photos on a plain background look best.

A photo taken from straight above can spin like the real top: set `"photoSpins": true` on that Bey.

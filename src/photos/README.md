# Bey photos

Drop photos here named after the Bey's `id` from `src/data/beys.json`, and the app shows them instead of the drawn stand-in. No code changes needed.

- `rudder-phoenix.webp` (or `.jpg`, `.png`): the Bey itself. It is shown big at the top of its page, on its tile, and next to the blade stats.
- `rudder-phoenix.ratchet.webp` and `rudder-phoenix.bit.webp`: optional pictures of the ratchet and bit, shown next to their stats like on the back of the box.
- Square photos on a plain background look best. Keep each one under about 1 MB.
- A photo taken from straight above can spin like the real top: set `"photoSpins": true` on that Bey in `beys.json`.

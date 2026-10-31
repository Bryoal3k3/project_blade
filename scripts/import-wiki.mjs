#!/usr/bin/env node
// Imports every Beyblade X that Hasbro sells (Starter Packs, Booster Packs, X-Over, and the Beys
// inside Dual Packs and Multipack Sets) from the Beyblade fan wiki: names, parts, stats, release
// dates and pictures.
//
//   npm run import            update src/data/beys.json and download missing pictures
//   npm run import -- --force re-download every picture
//
// Stats printed on a Hasbro box win over the wiki: put them in scripts/box-stats.json.

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA_FILE = path.join(ROOT, 'src/data/beys.json');
const PACKS_FILE = path.join(ROOT, 'src/data/packs.json');
const PHOTO_DIR = path.join(ROOT, 'src/photos');
const BOX_STATS_FILE = path.join(ROOT, 'scripts/box-stats.json');
const API = 'https://beyblade.fandom.com/api.php';
const HEADERS = { 'user-agent': 'ProjectBlade/0.1 (family Beyblade catalog app)' };
const LIST_PAGE = 'List of Beyblade X products (Hasbro)';
const FORCE = process.argv.includes('--force');

/** Which sections of the Hasbro list hold Beys, how each is sold, and whether it is a pack of several. */
const SECTIONS = [
  ['Starter Packs', 'Starter', false],
  ['Booster Packs', 'Booster', false],
  ['X-Over Project', 'Starter', false],
  ['Dual Packs', 'Dual Pack', true],
  ['Multipack Sets', 'Multipack', true],
  ['Bey Packs/Sets', 'Set', true],
  ['Battle Sets', 'Battle Set', true],
  ['Accessories', 'Launcher Set', true],
];

/** Infobox field -> wiki page prefix and the label printed on the box. */
const PIECES = {
  LockChip: { page: 'Lock Chip', label: 'Lock Chip' },
  OverBlade: { page: 'Over Blade', label: 'Over Blade' },
  MainBlade: { page: 'Main Blade', label: 'Primary Blade' },
  MetalBlade: { page: 'Metal Blade', label: 'Metal Blade' },
  AssistBlade: { page: 'Assist Blade', label: 'Auxiliary Blade' },
};
const LINES = { 'Basic Line': 'BX', 'Unique Line': 'UX', 'Custom Line': 'CX' };
/** Product photos taken from an angle whose file names don't say so. Their Beys don't spin. */
const SIDE_VIEW_PHOTOS = new Set(['coil-orochi-6-60lf']);
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const ART = {
  attack: { shape: 'blade', accents: ['#FFC24B', '#E8ECF5', '#FF9A3D', '#3EC6FF'] },
  defense: { shape: 'wall', accents: ['#C9D6FF', '#FFD54A', '#B9C3D6', '#7FD0FF'] },
  stamina: { shape: 'round', accents: ['#9EE6FF', '#7FD0FF', '#E8ECF5', '#FFC24B'] },
  balance: { shape: 'wing', accents: ['#6A35D9', '#8B3DFF', '#FF9A3D', '#E8ECF5'] },
};

// ---------- wiki access ----------

async function api(params, attempt = 1) {
  const url = `${API}?${new URLSearchParams({ ...params, format: 'json', formatversion: '2' })}`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (attempt >= 4) throw new Error(`${url}: ${err.message}`);
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    return api(params, attempt + 1);
  }
}

/** Page text for each title, following redirects. Returns title -> { title, text }. */
async function pages(titles) {
  const out = new Map();
  const unique = [...new Set(titles)];
  for (let i = 0; i < unique.length; i += 40) {
    const chunk = unique.slice(i, i + 40);
    const { query } = await api({ action: 'query', titles: chunk.join('|'), prop: 'revisions', rvprop: 'content', rvslots: 'main', redirects: '1' });
    const normalized = Object.fromEntries((query.normalized ?? []).map((n) => [n.from, n.to]));
    const redirects = Object.fromEntries((query.redirects ?? []).map((r) => [r.from, r.to]));
    const byTitle = Object.fromEntries(query.pages.map((p) => [p.title, p]));
    for (const asked of chunk) {
      const norm = normalized[asked] ?? asked;
      const title = redirects[norm] ?? norm;
      const text = byTitle[title]?.revisions?.[0]?.slots?.main?.content;
      out.set(asked, { title, text });
    }
  }
  return out;
}

/** Direct download URL for each wiki file name. */
async function fileUrls(names) {
  const out = new Map();
  const unique = [...new Set(names)];
  for (let i = 0; i < unique.length; i += 40) {
    const chunk = unique.slice(i, i + 40);
    const { query } = await api({ action: 'query', titles: chunk.map((n) => `File:${n}`).join('|'), prop: 'imageinfo', iiprop: 'url' });
    const normalized = Object.fromEntries((query.normalized ?? []).map((n) => [n.from, n.to]));
    const byTitle = Object.fromEntries(query.pages.map((p) => [p.title, p]));
    for (const name of chunk) {
      const asked = `File:${name}`;
      const url = byTitle[normalized[asked] ?? asked]?.imageinfo?.[0]?.url;
      if (url) out.set(name, url);
    }
  }
  return out;
}

// ---------- wikitext parsing ----------

/** Fields of the first {{<name> ...}} template in the text. */
function infobox(text, name) {
  const start = text?.indexOf(`{{${name}`) ?? -1;
  if (start < 0) return null;
  let depth = 0;
  let end = start;
  for (let i = start; i < text.length - 1; i++) {
    if (text.startsWith('{{', i)) {
      depth++;
      i++;
    } else if (text.startsWith('}}', i)) {
      depth--;
      i++;
      if (depth === 0) {
        end = i - 1;
        break;
      }
    }
  }
  const fields = {};
  for (const chunk of text.slice(start + 2 + name.length, end).split(/\n\s*\|/)) {
    const m = /^\s*\|?\s*([A-Za-z0-9]+)\s*=([\s\S]*)$/.exec(chunk);
    if (m) fields[m[1]] = m[2].replace(/<!--[\s\S]*?-->/g, '').trim();
  }
  return fields;
}

/** Plain text from a wikitext value: links become their label, tags and templates go away. */
function plain(value = '') {
  return value
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/'''?/g, '')
    .trim();
}

/** The first number in a stat field, e.g. "55<br>60 (2.0)" -> 55, "8.5" -> 8.5. */
function stat(value) {
  const m = /\d+(?:\.\d+)?/.exec(plain(value));
  return m ? Number(m[0]) : undefined;
}

function grams(value) {
  const m = /(\d+(?:\.\d+)?)\s*g/.exec(plain(value));
  return m ? Number(m[1]) : undefined;
}

/** "February 12th, 2026" -> "2026-02-12", "June 2025" -> "2025-06". */
function date(value) {
  const m = /([A-Za-z]+)\s+(?:(\d{1,2})(?:st|nd|rd|th)?,?\s+)?(\d{4})/.exec(plain(value));
  if (!m) return undefined;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  if (month < 0) return undefined;
  const mm = String(month + 1).padStart(2, '0');
  return m[2] ? `${m[3]}-${mm}-${m[2].padStart(2, '0')}` : `${m[3]}-${mm}`;
}

/** First file name in an image field, which may be a single file or a <gallery>. */
function imageName(value = '') {
  const lines = value.replace(/<\/?gallery[^>]*>/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean);
  return lines[0]?.split('|')[0].replace(/^File:/, '').trim() || undefined;
}

function hasbroAka(fields) {
  const m = /([^\n]+?)\s*\((?:\[\[)?Hasbro/.exec(plain(fields.AKA ?? ''));
  return m ? m[1].trim() : undefined;
}

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function hash(text) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

// ---------- the Hasbro list ----------

/** Canadian list price in a list row, e.g. "[[File:Flag of Canada.png|20px]] $16.99" -> 16.99. */
function canadianPrice(rowText) {
  const m = /Flag of Canada\.png[^\]]*\]\]\s*(?:CAD)?\$(\d+(?:\.\d{2})?)/.exec(rowText);
  return m ? Number(m[1]) : undefined;
}

/** Every product row in the Hasbro list that is sold in Canada or the US, with its section, price and date. */
function hasbroProducts(listText) {
  const products = [];
  let section = '';
  let row = null;
  const finish = () => {
    if (!row?.title) return;
    const match = SECTIONS.find(([key]) => row.section.includes(key));
    const text = row.text.replace(/<!--[\s\S]*?-->/g, '');
    const flags = [...text.matchAll(/Flag of ([A-Za-z ]+)\.png/g)].map((m) => m[1]);
    const soldHere = !flags.length || flags.includes('Canada') || flags.includes('United States');
    if (match && soldHere && !products.some((p) => p.title === row.title)) {
      products.push({ title: row.title, set: match[1], pack: match[2], price: canadianPrice(text) });
    }
  };
  for (const line of listText.split('\n')) {
    const heading = /^!\s*colspan="\d+"\s*\|(.*)$/.exec(line);
    if (heading || line.startsWith('|-')) {
      finish();
      row = heading ? null : { section, title: undefined, text: '' };
      if (heading) section = heading[1].trim();
      continue;
    }
    if (!row) continue;
    row.text += `${line}\n`;
    const link = /^\|\s*\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/.exec(line);
    if (link && !row.title && !link[1].startsWith('File:')) row.title = link[1];
  }
  finish();
  return products;
}

/** Bey pages linked from a pack page's Contents section. */
function packContents(text = '') {
  const section = /==\s*Contents\s*==([\s\S]*?)(?:\n==|$)/.exec(text)?.[1] ?? '';
  return [...section.matchAll(/^\*+\s*\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/gm)].map((m) => m[1].trim());
}

/**
 * Single Beys first, then the Beys inside each pack. A Bey sold both ways lists its packs.
 * Also returns each pack with the Bey titles inside it.
 */
async function allProducts(listText) {
  const listed = hasbroProducts(listText);
  const products = listed.filter((p) => !p.pack).map((p) => ({ title: p.title, set: p.set, price: p.price, packs: [] }));
  const packs = [];
  const packRows = listed.filter((p) => p.pack);
  const packPages = await pages(packRows.map((p) => p.title));
  for (const row of packRows) {
    const page = packPages.get(row.title);
    const fields = infobox(page.text, 'Product Infobox') ?? infobox(page.text, 'Beyblade Set Infobox') ?? {};
    const pack = { name: row.title, set: row.set, price: row.price, released: date(fields.ReleaseCA) ?? date(fields.ReleaseUS), titles: [] };
    // Some sets (like deluxe launcher sets) redirect straight to the one Bey inside them.
    const contents = packContents(page.text);
    if (!contents.length && infobox(page.text, 'Beyblade Infobox')) contents.push(page.title);
    for (const title of contents) {
      let product = products.find((p) => p.title === title);
      if (!product) products.push((product = { title, set: pack.set, packs: [], packReleased: pack.released }));
      if (!product.packs.includes(pack.name)) product.packs.push(pack.name);
      pack.titles.push(title);
    }
    packs.push(pack);
  }
  console.log(`Hasbro list: ${listed.length - packRows.length} single Beys and ${packRows.length} packs and sets, ${products.length} Beys in all`);
  return { products, packs };
}

// ---------- pictures ----------

/** Makes the plain light background around a product shot transparent, trims and shrinks it. */
async function cutOut(buffer, size) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const isBackground = (i) => {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    return a < 24 || (r > 214 && g > 214 && b > 214 && Math.max(r, g, b) - Math.min(r, g, b) < 26);
  };
  const seen = new Uint8Array(w * h);
  const queue = [];
  const push = (x, y) => {
    const p = y * w + x;
    if (seen[p] || !isBackground(p * 4)) return;
    seen[p] = 1;
    queue.push(p);
  };
  for (let x = 0; x < w; x++) push(x, 0), push(x, h - 1);
  for (let y = 0; y < h; y++) push(0, y), push(w - 1, y);
  while (queue.length) {
    const p = queue.pop();
    const x = p % w, y = (p - x) / w;
    data[p * 4 + 3] = 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
  return sharp(data, { raw: info })
    .trim({ threshold: 1 })
    .resize(size, size, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, alphaQuality: 90 })
    .toBuffer();
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function savePicture(url, file, size) {
  if (!FORCE && (await exists(file))) return 'kept';
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, await cutOut(Buffer.from(await res.arrayBuffer()), size));
  return 'saved';
}

// ---------- main ----------

async function main() {
  const list = await pages([LIST_PAGE]);
  const { products, packs } = await allProducts(list.get(LIST_PAGE).text);

  const productPages = await pages(products.map((p) => p.title));
  const parsed = [];
  const partTitles = [];
  // Different names can point at the same wiki page (e.g. "DranSword 3-60F" and "Sword Dran 3-60F").
  // The first one wins; the others only add their packs to it.
  const byPage = new Map();
  const aliases = [];
  for (const product of products) {
    const page = productPages.get(product.title);
    const fields = infobox(page.text, 'Beyblade Infobox');
    if (fields && !fields.Bit) {
      console.warn(`  skipped ${product.title}: not a Beyblade X top`);
      continue;
    }
    if (!fields) {
      // Pack contents also link launchers and other extras; only Beys have this infobox.
      if (!product.packs.length) console.warn(`  skipped ${product.title}: no Beyblade infobox`);
      continue;
    }
    const first = byPage.get(page.title);
    if (first) {
      for (const pack of product.packs) if (!first.product.packs.includes(pack)) first.product.packs.push(pack);
      aliases.push([product.title, first]);
      continue;
    }
    const part = (key, prefix) => (fields[key] ? `${prefix} - ${plain(fields[key])}` : undefined);
    const titles = {
      blade: part('BladeX', 'Blade') ?? part('Blade', 'Blade') ?? part('RatchetBlade', 'Ratchet-Integrated Blade'),
      ratchet: part('Ratchet', 'Ratchet'),
      bit: part('Bit', 'Bit'),
      pieces: Object.entries(PIECES).flatMap(([key, info]) => (fields[key] ? [{ key, label: info.label, title: `${info.page} - ${plain(fields[key])}` }] : [])),
    };
    partTitles.push(titles.blade, titles.ratchet, titles.bit, ...titles.pieces.map((p) => p.title));
    const entry = { product, page, fields, titles };
    byPage.set(page.title, entry);
    parsed.push(entry);
  }

  const partPages = await pages(partTitles.filter(Boolean));
  const partInfo = (title) => {
    if (!title) return undefined;
    const fields = infobox(partPages.get(title)?.text, 'Part Infobox');
    if (!fields) return { missing: true, name: title.split(' - ').slice(1).join(' - ') };
    const s = { attack: stat(fields.AttackStat), defense: stat(fields.DefenseStat), stamina: stat(fields.StaminaStat), dash: stat(fields.DashStat), burstResistance: stat(fields.BurstResistanceStat) };
    return { fields, name: plain(fields.Name) || title.split(' - ').slice(1).join(' - '), hasbro: hasbroAka(fields), stats: s, weight: grams(fields.Weight), image: imageName(fields.Image ?? fields.Image1), type: plain(fields.Type).toLowerCase() || undefined };
  };
  const threeStats = (s) => (s && [s.attack, s.defense, s.stamina].every((v) => v !== undefined) ? { attack: s.attack, defense: s.defense, stamina: s.stamina } : undefined);

  const boxStats = JSON.parse(await fs.readFile(BOX_STATS_FILE, 'utf8').catch(() => '{}'));
  const beys = [];
  const pictures = [];
  const report = { noStats: [], noPicture: [] };

  for (const entry of parsed) {
    const { product, page, fields, titles } = entry;
    // A link straight to a Takara Tomy page: use the Hasbro name that page gives.
    const aka = hasbroAka(fields);
    const title = product.title === page.title && aka ? aka : product.title;
    const words = title.split(' ');
    const combo = words.at(-1);
    const hasbroName = words.slice(0, -1).join(' ');
    const id = slug(title);
    entry.id = id;
    const type = plain(fields.Type).toLowerCase();
    const ratchetName = titles.ratchet ? plain(fields.Ratchet) : undefined;
    const bitCode = ratchetName && combo.startsWith(ratchetName) ? combo.slice(ratchetName.length) : combo.replace(/^\d-\d{2}/, '');
    const pageName = page.title !== title ? page.title.split(' ').slice(0, -1).join(' ') : undefined;
    const sameName = (a, b) => a?.replace(/\s+/g, '').toLowerCase() === b?.replace(/\s+/g, '').toLowerCase();

    // Blade: one part, or a Custom Line blade built from pieces whose stats add up (as the box shows).
    const blade = {};
    const bladePart = partInfo(titles.blade);
    const knownType = (t) => (['attack', 'defense', 'stamina', 'balance'].includes(t) ? t : undefined);
    if (titles.pieces.length) {
      const pieces = titles.pieces.map((p) => ({ ...p, info: partInfo(p.title) }));
      blade.pieces = pieces.map((p) => ({ label: p.label, name: p.info.hasbro ?? p.info.name }));
      blade.type = knownType(pieces.find((p) => p.key === 'MainBlade' || p.key === 'MetalBlade')?.info.type);
      const scored = pieces.filter((p) => p.key !== 'LockChip').map((p) => threeStats(p.info.stats));
      if (scored.length && scored.every(Boolean)) {
        blade.stats = scored.reduce((sum, s) => ({ attack: sum.attack + s.attack, defense: sum.defense + s.defense, stamina: sum.stamina + s.stamina }));
      }
    } else if (bladePart) {
      blade.stats = threeStats(bladePart.stats);
      blade.weight = bladePart.weight;
      blade.type = knownType(bladePart.type);
      if (fields.RatchetBlade) blade.integratedRatchet = true;
    }

    const ratchetPart = partInfo(titles.ratchet);
    const ratchet = ratchetPart && { name: ratchetName, stats: threeStats(ratchetPart.stats), weight: ratchetPart.weight };
    const bitPart = partInfo(titles.bit);
    const bit = {
      code: bitCode,
      name: plain(fields.Bit),
      type: knownType(bitPart?.type),
      stats: bitPart?.stats && Object.values(bitPart.stats).every((v) => v !== undefined) ? bitPart.stats : undefined,
      weight: bitPart?.weight,
    };

    // Numbers copied from a real Hasbro box replace the wiki's: first for a part wherever it
    // appears ("ratchet:2-60", "bit:LF"), then for this Bey.
    const partBox = {
      ...(ratchet && boxStats[`ratchet:${ratchetName}`] ? { ratchet: boxStats[`ratchet:${ratchetName}`] } : {}),
      ...(boxStats[`bit:${bitCode}`] ? { bit: boxStats[`bit:${bitCode}`] } : {}),
    };
    const fromBox = { ...partBox, ...(boxStats[id] ?? {}) };
    for (const [key, value] of Object.entries(fromBox)) {
      if (key === 'blade') blade.stats = value;
      if (key === 'ratchet' && ratchet) ratchet.stats = value;
      if (key === 'bit') bit.stats = value;
    }

    const picture = imageName(fields.Image ?? fields.Image1);
    if (picture) pictures.push({ name: picture, file: path.join(PHOTO_DIR, `${id}.webp`), size: 384 });
    else report.noPicture.push(product.title);
    for (const [kind, info] of [['ratchet', ratchetPart], ['bit', bitPart]]) {
      if (!info?.image) continue;
      const key = `${kind}-${slug(kind === 'ratchet' ? ratchetName : bit.name)}`;
      (kind === 'ratchet' ? ratchet : bit).photo = key;
      pictures.push({ name: info.image, file: path.join(PHOTO_DIR, 'parts', `${key}.webp`), size: 192 });
    }

    const art = ART[type] ?? ART.balance;
    const bey = {
      id,
      names: { hasbro: hasbroName, ...(pageName && !sameName(pageName, hasbroName) ? { takaraTomy: pageName } : {}) },
      line: LINES[plain(fields.System)] ?? 'BX',
      productCode: /\b([A-Z]\d{4})\b(?=[^\n]*Hasbro|$)/.exec(plain(fields.ProductCode))?.[1],
      set: product.set,
      type,
      spin: /left/i.test(fields.SpinDirection ?? '') ? 'left' : 'right',
      released: date(fields.ReleaseCA) ?? date(fields.ReleaseUS) ?? product.packReleased,
      ...(product.packs.length ? { packs: product.packs } : {}),
      ...(product.price ? { price: product.price } : {}),
      weight: grams(fields.Weight),
      statsFrom: Object.keys(fromBox).length ? 'Hasbro box' : 'Beyblade wiki',
      blade,
      ...(ratchet ? { ratchet } : {}),
      bit,
      photoSpins: picture ? !/angled|side view|contents|box/i.test(picture) && !SIDE_VIEW_PHOTOS.has(id) : undefined,
      art: { shape: art.shape, blades: 3 + (hash(id) % 4), accent: art.accents[hash(id) % art.accents.length] },
    };
    beys.push(JSON.parse(JSON.stringify(bey)));
    const missing = [!blade.stats && 'blade', ratchet && !ratchet.stats && 'ratchet', !bit.stats && 'bit'].filter(Boolean);
    if (missing.length) report.noStats.push(`${product.title} (${missing.join(', ')})`);
  }

  await fs.writeFile(DATA_FILE, `${JSON.stringify(beys, null, 2)}\n`);
  console.log(`Wrote ${beys.length} Beys to ${path.relative(ROOT, DATA_FILE)}`);

  // Each pack with the ids of the Beys inside it, for the shopping list.
  const ids = new Set(beys.map((bey) => bey.id));
  const titleToId = new Map(parsed.map((entry) => [entry.product.title, entry.id]));
  for (const [alias, entry] of aliases) titleToId.set(alias, entry.id);
  const packList = packs
    .map((pack) => ({
      name: pack.name,
      set: pack.set,
      ...(pack.price ? { price: pack.price } : {}),
      ...(pack.released ? { released: pack.released } : {}),
      beys: [...new Set(pack.titles.map((title) => titleToId.get(title)))].filter((id) => ids.has(id)),
    }))
    .filter((pack) => pack.beys.length)
    .sort((a, b) => a.name.localeCompare(b.name));
  await fs.writeFile(PACKS_FILE, `${JSON.stringify(packList, null, 2)}\n`);
  console.log(`Wrote ${packList.length} packs and sets to ${path.relative(ROOT, PACKS_FILE)}`);

  const urls = await fileUrls(pictures.map((p) => p.name));
  const counts = { saved: 0, kept: 0, failed: 0 };
  const seenFiles = new Set();
  for (const picture of pictures) {
    if (seenFiles.has(picture.file)) continue;
    seenFiles.add(picture.file);
    const url = urls.get(picture.name);
    if (!url) {
      report.noPicture.push(picture.name);
      counts.failed++;
      continue;
    }
    try {
      counts[await savePicture(url, picture.file, picture.size)]++;
    } catch (err) {
      console.warn(`  picture failed: ${err.message}`);
      counts.failed++;
    }
  }
  console.log(`Pictures: ${counts.saved} saved, ${counts.kept} already there, ${counts.failed} failed`);
  if (report.noStats.length) console.log(`Missing stats (add them to scripts/box-stats.json from the box):\n  ${report.noStats.join('\n  ')}`);
  if (report.noPicture.length) console.log(`Missing pictures:\n  ${report.noPicture.join('\n  ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const products = JSON.parse(read("assets/products.json"));
const cfg = JSON.parse(read("tools/order.json"));
const template = read("tools/page.html");

const bySlug = new Map(products.map((p) => [p.slug, p]));
const order = cfg.order.filter((s) => bySlug.has(s));
for (const p of products) if (!order.includes(p.slug)) order.push(p.slug);
const list = order.map((s) => bySlug.get(s));

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function webpSize(file) {
  const b = readFileSync(join(root, "assets/work", file));
  const tag = b.toString("ascii", 12, 16);
  if (tag === "VP8X") return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (tag === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }
  return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
}

function shape(img) {
  const { w, h } = img;
  const r = w / h;
  if (Math.abs(r - 0.8) < 0.02) return "card";
  if (r < 0.75) return "phone";
  return "desk";
}

for (const p of list) {
  for (const im of p.images) {
    if (!existsSync(join(root, "assets/work", im.f))) throw new Error("missing image " + im.f + " for " + p.slug);
    Object.assign(im, webpSize(im.f));
    im.shape = shape(im);
  }
  if (p.logo && !existsSync(join(root, "assets/logos", p.logo))) throw new Error("missing logo " + p.logo);
}

const tones = { use: "In use", demo: "Live", proto: "Prototype", review: "In review" };
const openable = (p) => Boolean(p.live && p.live.url);
const counts = {
  built: list.length,
  live: list.filter(openable).length,
  use: list.filter((p) => p.status.tone === "use").length,
};

const arrow = '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 11 11 5M6 5h5v5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const copyIc = '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 3.5v-.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
const lockIc = '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
const closeIc = '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

const ext = (url, label, cls) => `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}${arrow}</a>`;

function logo(p, size = 40) {
  if (!p.logo) return `<span class="logo logo-none" aria-hidden="true"></span>`;
  return `<img class="logo" src="assets/logos/${esc(p.logo)}" width="${size}" height="${size}" alt="" loading="lazy" decoding="async">`;
}

function img(im, p, opts = {}) {
  const pri = opts.priority ? ' fetchpriority="high"' : ' loading="lazy"';
  const alt = `${p.name}: ${im.c}`;
  return `<img src="assets/work/${esc(im.f)}" width="${im.w}" height="${im.h}" alt="${esc(alt)}"${pri} decoding="async">`;
}

function cover(p) {
  if (!p.images.length) {
    return `<div class="cover cover-private"><div class="priv">${lockIc}<p>${esc(p.private || "Screens stay private.")}</p></div></div>`;
  }
  const im = p.images[0];
  return `<div class="cover cover-${im.shape}">${img(im, p)}</div>`;
}

function statusPill(p) {
  return `<span class="status s-${p.status.tone}">${esc(p.status.label)}</span>`;
}

function loginChip(p) {
  if (!p.login) return "";
  return `<button class="chip copy" type="button" data-copy="${esc(p.login)}" aria-label="Copy demo login ${esc(p.login)}">${copyIc}<span class="chip-k">Demo login</span><code>${esc(p.login)}</code></button>`;
}

function names(p, tag, id) {
  return `<${tag} class="names"${id ? ` id="${id}"` : ""}><span class="bn" lang="bn">${esc(p.bn)}</span><span class="en">${esc(p.name)}</span></${tag}>`;
}

function card(p, i) {
  const q = [p.name, p.bn, p.kind, p.industry, p.promise, ...(p.stack || [])].join(" ").toLowerCase();
  const primary = openable(p)
    ? ext(p.live.url, p.live.url.includes("play.google.com") ? p.live.label : "Try it live", "btn btn-primary")
    : p.private
      ? `<span class="btn btn-quiet">${lockIc}Private client system</span>`
      : p.links && p.links[0]
        ? ext(p.links[0].url, p.links[0].label, "btn btn-secondary")
        : `<span class="btn btn-quiet">No public link yet</span>`;
  const guide = p.guide ? ext(p.guide, "Guide", "tlink") : "";
  return `<article class="card${i >= 6 ? " defer" : ""}" id="p-${p.slug}" data-ind="${p.industry}" data-live="${openable(p) ? 1 : 0}" data-q="${esc(q)}" style="--b:${p.brand}">
${cover(p)}
<div class="body">
<div class="head">${logo(p)}<div>${names(p, "h3")}<p class="kind">${esc(p.kind)}</p></div></div>
${statusPill(p)}
<p class="promise">${esc(p.promise)}</p>
<ul class="tags" aria-label="Built with">${(p.stack || []).slice(0, 4).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
<div class="actions">
<div class="row">${primary}<button class="btn btn-ghost" type="button" commandfor="d-${p.slug}" command="show-modal">Details</button></div>
${loginChip(p) || guide ? `<div class="row row-sub">${loginChip(p)}${guide}</div>` : ""}
</div>
</div>
</article>`;
}

function dialog(p) {
  const gallery = p.images.length
    ? `<div class="gal" tabindex="0" aria-label="${esc(p.name)} screens">${p.images.map((im) => `<figure class="g-${im.shape}">${img(im, p)}<figcaption>${esc(im.c)}</figcaption></figure>`).join("")}</div>`
    : `<div class="gal-private">${lockIc}<p>${esc(p.private || "Screens stay private.")}</p></div>`;
  const tryBits = [];
  if (openable(p)) tryBits.push(ext(p.live.url, "Try it live", "btn btn-primary"));
  if (p.login) tryBits.push(loginChip(p));
  if (p.loginNote) tryBits.push(`<p class="note">${esc(p.loginNote)}</p>`);
  if (p.note) tryBits.push(`<p class="note">${esc(p.note)}</p>`);
  if (p.private) tryBits.push(`<p class="note">${esc(p.private)} It runs for a real customer, so there is no public demo.</p>`);
  const more = [];
  if (p.guide) more.push(ext(p.guide, "Guide and manual", "tlink"));
  for (const l of p.links || []) more.push(ext(l.url, l.label, "tlink"));
  if (more.length) tryBits.push(`<div class="more">${more.join("")}</div>`);
  if (openable(p)) tryBits.push(`<p class="url"><span>Link</span> <code>${esc(p.live.url.replace(/^https?:\/\//, ""))}</code></p>`);
  return `<dialog id="d-${p.slug}" class="sheet" closedby="any" aria-labelledby="t-${p.slug}" style="--b:${p.brand}">
<div class="sheet-in">
<header class="sheet-head">${logo(p, 48)}<div>${names(p, "h2", "t-" + p.slug)}<p class="kind">${esc(p.kind)} ${statusPill(p)}</p></div><button class="x" type="button" commandfor="d-${p.slug}" command="close" aria-label="Close">${closeIc}</button></header>
<p class="sheet-promise">${esc(p.promise)}</p>
${gallery}
<div class="sheet-grid">
<div>
<h3>What it does</h3>
<ul class="facts">${p.facts.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
<h3>Who it is for</h3>
<p>${esc(p.who)}</p>
${p.offer ? `<h3>Price</h3><p>${esc(p.offer)}</p>` : ""}
</div>
<aside class="try">
<h3>Try it</h3>
${tryBits.join("\n")}
<h3>Built with</h3>
<ul class="tags">${(p.stack || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
</aside>
</div>
</div>
</dialog>`;
}

function chips() {
  const all = `<button class="fchip" type="button" data-f="all" aria-pressed="true">All <span>${list.length}</span></button>`;
  const inds = cfg.industries
    .map((g) => ({ ...g, n: list.filter((p) => p.industry === g.id).length }))
    .filter((g) => g.n)
    .map((g) => `<button class="fchip" type="button" data-f="${g.id}" aria-pressed="false">${esc(g.label)} <span>${g.n}</span></button>`)
    .join("");
  const live = `<button class="fchip fchip-live" type="button" data-live-toggle aria-pressed="false"><i aria-hidden="true"></i>Try now <span>${counts.live}</span></button>`;
  return all + inds + live;
}

function heroCovers() {
  return cfg.hero
    .map((s, i) => {
      const p = bySlug.get(s);
      const im = p.images[0];
      return `<a class="hc hc-${i}" href="#p-${p.slug}" style="--b:${p.brand}">${img(im, p, { priority: i === 0 })}</a>`;
    })
    .join("");
}

function running() {
  return cfg.running
    .map((s) => {
      const p = bySlug.get(s);
      const link = openable(p) ? ext(p.live.url, p.live.url.replace(/^https?:\/\//, "").replace(/\/$/, ""), "tlink") : `<span class="priv-tag">${lockIc}Private, for a client</span>`;
      return `<li style="--b:${p.brand}"><div class="r-head">${logo(p, 32)}${names(p, "h3")}</div><p>${esc(p.promise)}</p>${link}</li>`;
    })
    .join("");
}

const html = template
  .replaceAll("{{BUILT}}", String(counts.built))
  .replaceAll("{{LIVE}}", String(counts.live))
  .replaceAll("{{USE}}", String(counts.use))
  .replace("{{HERO_COVERS}}", heroCovers())
  .replace("{{RUNNING}}", running())
  .replace("{{CHIPS}}", chips())
  .replace("{{CARDS}}", list.map(card).join("\n"))
  .replace("{{DIALOGS}}", list.map(dialog).join("\n"));

writeFileSync(join(root, "index.html"), html);
console.log(`index.html: ${counts.built} products, ${counts.live} open now, ${counts.use} in use`);

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const order = JSON.parse(readFileSync(join(root, "tools/order.json"), "utf8"));
const mdir = join(root, "assets/work/_manifest");
const all = Object.fromEntries(
  readdirSync(mdir).filter((f) => f.endsWith(".json")).map((f) => {
    const m = JSON.parse(readFileSync(join(mdir, f), "utf8"));
    return [m.slug, m];
  })
);

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const bn = (s) => (s ? `<span lang="bn">${esc(s)}</span>` : "");
const imgOk = (f) => existsSync(join(root, "assets/work", f));

const items = order.items.map((o) => {
  const m = { ...all[o.slug], ...o };
  if (!all[o.slug]) console.warn("missing manifest", o.slug);
  m.images = (m.images || []).filter((i) => imgOk(i.file));
  return m;
});

const groups = order.groups;
const tone = (s) => {
  const t = (s || "").toLowerCase();
  if (t.includes("real") || t.includes("live ·") || t === "live") return "live";
  if (t.includes("demo") || t.includes("live")) return "demo";
  if (t.includes("closed") || t.includes("review") || t.includes("test")) return "hold";
  return "built";
};

const frame = (img, cls = "", lazy = true, w) => {
  const dims = img.kind === "phone" ? 'width="780" height="1688"' : 'width="1440" height="900"';
  return `<div class="frame ${img.kind === "phone" ? "phone" : "desk"} ${cls}"><img src="assets/work/${esc(img.file)}" alt="${esc(img.caption)}" ${dims} ${lazy ? 'loading="lazy" decoding="async"' : 'fetchpriority="high"'}></div>`;
};

const plate = (m) => {
  const phones = m.images.filter((i) => i.kind === "phone");
  const desks = m.images.filter((i) => i.kind !== "phone");
  let inner;
  let cls = "";
  if (!m.images.length) {
    inner = `<div class="no-shot"><div>${m.name_bn ? `<b>${esc(m.name_bn)}</b>` : ""}${esc(m.noshot || "Screens on request")}</div></div>`;
  } else if (m.images[0].kind !== "phone") {
    inner = frame(desks[0]);
  } else if (phones.length > 1) {
    cls = " two";
    inner = frame(phones[0]) + frame(phones[1]);
  } else {
    inner = frame(phones[0]);
  }
  return `<div class="item-plate${cls}" aria-hidden="false">${inner}</div>`;
};

let n = 0;
const cards = items.map((m) => {
  n++;
  const no = "2." + String(n).padStart(2, "0");
  const t = m.tone || tone(m.status);
  const ping = m.live_url ? ` data-ping="${esc(m.live_url)}"` : "";
  const open = m.live_url && m.openable !== false ? " data-openable" : "";
  const link = m.live_url ? `<a class="go" href="${esc(m.live_url)}" rel="noopener" target="_blank">${esc(m.cta || "Open it")} <span aria-hidden="true">↗</span></a>` : `<span class="stack mono">${esc((m.stack || []).slice(0, 3).join(" · "))}</span>`;
  return `
        <article class="item"${open} data-group="${esc(m.group)}" data-tone="${t}" data-slug="${esc(m.slug)}" style="view-transition-name:it-${esc(m.slug)}">
          ${plate(m).replace('<div class="item-plate', `<div class="item-plate`)}
          <span class="item-no mono" aria-hidden="true">${no}</span>
          <div class="item-body">
            <div class="item-top"><span class="item-kind mono">${esc(m.kind)}</span><span class="status ${t} mono"${ping}><span class="dot"></span>${esc(m.status_short || m.status.split(" · ")[0])}</span></div>
            <h3><button type="button" data-open="${esc(m.slug)}">${esc(m.name)}</button>${bn(m.name_bn)}</h3>
            <p>${esc(m.what)}</p>
            <div class="item-foot">${link}${m.live_url ? `<span class="stack mono">${esc((m.stack || []).slice(0, 2).join(" · "))}</span>` : ""}</div>
          </div>
        </article>`;
}).join("");

const counts = Object.fromEntries(groups.map((g) => [g.id, items.filter((m) => g.id === "all" || m.group === g.id).length]));
const liveCount = items.filter((m) => m.live_url && m.openable !== false).length;
const chips = groups.map((g, i) => `<button class="chip" type="button" data-filter="${g.id}" aria-pressed="${i === 0}">${esc(g.label)} <span class="mono">${counts[g.id]}</span></button>`).join("");

const section = `<div class="cat" id="index">
        <div class="cat-tools" role="toolbar" aria-label="Filter the index">
          ${chips}
          <button class="chip live-only" type="button" data-live aria-pressed="false">Open-able now <span class="mono">${liveCount}</span></button>
          <p class="cat-count mono" id="cat-count" aria-live="polite">${items.length} systems · ${liveCount} you can open right now</p>
        </div>
        <div class="cat-grid" id="cat-grid">${cards}
        </div>
      </div>`;

const data = items.map((m) => ({
  slug: m.slug, name: m.name, bn: m.name_bn || "", kind: m.kind, what: m.what, hard: m.hard_part, facts: m.facts || [],
  stack: m.stack || [], status: m.status, tone: m.tone || tone(m.status), url: m.live_url || "", note: m.demo_note || "", cta: m.cta || "Open it",
  images: m.images.map((i) => ({ f: i.file, k: i.kind, c: i.caption })),
}));

const ex = order.exhibit.map((s) => items.find((m) => m.slug === s)).filter((m) => m && m.images.length);
const exSets = ex.map((m, i) => {
  const ph = m.images.filter((x) => x.kind === "phone");
  const dk = m.images.filter((x) => x.kind !== "phone");
  let inner;
  let mode = "";
  if (dk.length && ph.length) {
    inner = frame(dk[0], "f-desk", i > 0) + frame(ph[0], "f-ph1", i > 0) + (ph[1] ? frame(ph[1], "f-ph2", i > 0) : "");
  } else if (dk.length) {
    inner = frame(dk[0], "f-desk", i > 0) + (dk[1] ? frame({ ...dk[1] }, "f-ph1 f-desk2", i > 0) : "");
  } else {
    mode = " phones";
    inner = ph.slice(0, 3).map((p, k) => frame(p, "f-ph" + k, i > 0)).join("");
  }
  return `<div class="ex-set${mode}${i === 0 ? " on" : ""}" data-i="${i}" data-name="${esc(m.name)}" data-bn="${esc(m.name_bn || "")}" data-kind="${esc(m.kind)}" data-url="${esc(m.live_url || "")}" data-slug="${esc(m.slug)}">${inner}</div>`;
}).join("");
const first = ex[0];
const exhibit = `<figure class="exhibit" id="exhibit">
        <div class="fig-plate ex-plate">
          <div class="ex-stage" aria-live="off">${exSets}</div>
        </div>
        <div class="ex-bar">
          <p class="ex-name" id="ex-name">${esc(first.name)} ${bn(first.name_bn)}<small>${esc(first.kind)}</small></p>
          <div class="ex-dots" role="group" aria-label="Choose a product">${ex.map((m, i) => `<button type="button" data-go="${i}" aria-label="${esc(m.name)}" aria-current="${i === 0}"></button>`).join("")}</div>
          <button class="ex-pause" type="button" id="ex-pause" aria-label="Pause the slideshow" aria-pressed="false"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.4" height="12" rx="1"/><rect x="9.6" y="2" width="3.4" height="12" rx="1"/></svg></button>
          <a class="btn btn-line sm" id="ex-open" href="#index" data-open="${esc(first.slug)}">See details</a>
        </div>
        <figcaption><span class="mono">Fig. 1</span> Real screens, captured from the running products. Every one was designed, built and deployed by one person.</figcaption>
      </figure>`;

let html = readFileSync(join(root, "index.html"), "utf8");
const swap = (re, rep, label) => {
  if (!re.test(html)) throw new Error("anchor not found: " + label);
  html = html.replace(re, () => rep);
};
swap(/<div class="cat" id="index">[\s\S]*?(?=\s*<div class="sub-head")/, section, "index");
swap(/<figure class="exhibit" id="exhibit">[\s\S]*?<\/figure>/, exhibit, "exhibit");
swap(/<script type="application\/json" id="work-data">[\s\S]*?<\/script>/, `<script type="application/json" id="work-data">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`, "data");
html = html.replace(/(<b data-n="systems">)[^<]*(<\/b>)/g, `$1${items.length}$2`).replace(/(<b data-n="live">)[^<]*(<\/b>)/g, `$1${liveCount}$2`);
writeFileSync(join(root, "index.html"), html);
console.log("items", items.length, "live", liveCount, "exhibit", ex.length);

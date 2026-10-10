(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NS = "http://www.w3.org/2000/svg";

  const root = document.documentElement;
  const themeBtn = $("#theme");
  const metaScheme = $('meta[name="color-scheme"]');
  const themes = ["system", "light", "dark"];
  const currentTheme = () => root.dataset.theme || "system";
  const applyTheme = (t) => {
    if (t === "system") delete root.dataset.theme;
    else root.dataset.theme = t;
    metaScheme.content = t === "system" ? "light dark" : t;
    themeBtn.setAttribute("aria-label", "Colour theme: " + t);
    themeBtn.title = "Theme: " + t;
    try {
      if (t === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", t);
    } catch (e) {}
  };
  applyTheme(currentTheme());
  themeBtn.addEventListener("click", () => {
    applyTheme(themes[(themes.indexOf(currentTheme()) + 1) % themes.length]);
  });

  const pad = (n) => String(n).padStart(2, "0");
  const hm = (mins) => {
    const m = ((Math.round(mins) % 1440) + 1440) % 1440;
    return pad(Math.floor(m / 60)) + ":" + pad(m % 60);
  };
  const clock = $("#clock");
  const tick = () => {
    const t = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
    clock.textContent = t + " · UTC+6";
  };
  tick();
  setInterval(tick, 20000);

  const overlap = $("#overlap");
  const visitorTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (visitorTz && visitorTz !== "Asia/Dhaka") {
    const off = -new Date().getTimezoneOffset();
    const mineStart = 11 * 60 - 360, mineEnd = 23 * 60 - 360;
    const yoursStart = 9 * 60 - off, yoursEnd = 17 * 60 - off;
    let best = 0;
    for (const shift of [-1440, 0, 1440]) {
      const s = Math.max(mineStart, yoursStart + shift), e = Math.min(mineEnd, yoursEnd + shift);
      best = Math.max(best, e - s);
    }
    const localStart = hm(mineStart + off), localEnd = hm(mineEnd + off);
    const city = visitorTz.split("/").pop().replace(/_/g, " ");
    const hrs = Math.round(best / 60);
    overlap.innerHTML = "11:00–23:00 in Bangladesh. In " + city + " that is <b>" + localStart + "–" + localEnd + "</b>" +
      (hrs > 0 ? ", overlapping your 9-to-5 by " + hrs + (hrs === 1 ? " hour." : " hours.") : ".");
  }

  const copyBtn = $("#copy");
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(copyBtn.dataset.copy);
      copyBtn.textContent = "Copied";
    } catch (e) {
      copyBtn.textContent = "Select and copy";
    }
    setTimeout(() => (copyBtn.textContent = "Copy address"), 2200);
  });

  const pingOne = (el) => {
    if (!navigator.onLine || !window.fetch || el.dataset.pinged) return;
    el.dataset.pinged = "1";
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 7000);
    const t0 = performance.now();
    fetch(el.dataset.ping, { mode: "no-cors", cache: "no-store", signal: ctl.signal })
      .then(() => {
        const ms = Math.round(performance.now() - t0);
        const rt = document.createElement("span");
        rt.className = "rt";
        rt.textContent = "· " + ms + " ms";
        el.appendChild(rt);
        el.title = "Answered your browser just now in " + ms + " ms";
      })
      .catch(() => {})
      .finally(() => clearTimeout(timer));
  };
  if ("IntersectionObserver" in window) {
    const pio = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { pingOne(en.target); pio.unobserve(en.target); } });
    }, { rootMargin: "200px 0px" });
    $$("[data-ping]").forEach((el) => pio.observe(el));
  } else {
    $$("[data-ping]").forEach(pingOne);
  }

  const work = (() => { try { return JSON.parse($("#work-data").textContent); } catch (e) { return []; } })();
  const bySlug = Object.fromEntries(work.map((w) => [w.slug, w]));
  const escH = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  const det = $("#det");
  let lastOpener = null;
  const frameHTML = (im, eager) => '<div class="frame ' + (im.k === "phone" ? "phone" : "desk") + '"><img src="assets/work/' + escH(im.f) + '" alt="' + escH(im.c) + '"' + (eager ? "" : ' loading="lazy"') + "></div>";
  const showShot = (w, i) => {
    const im = w.images[i];
    $("#det-main").innerHTML = im ? frameHTML(im, true) : '<p class="mono item-kind">Screens on request</p>';
    $("#det-cap").textContent = im ? im.c : "";
    $$("#det-thumbs button").forEach((b, k) => b.setAttribute("aria-current", String(k === i)));
  };
  const openDet = (slug, opener) => {
    const w = bySlug[slug];
    if (!w || !det) return;
    lastOpener = opener || null;
    $("#det-kind").textContent = w.kind;
    $("#det-h").innerHTML = escH(w.name) + (w.bn ? ' <span lang="bn">' + escH(w.bn) + "</span>" : "");
    $("#det-status").innerHTML = '<span class="status ' + w.tone + ' mono"><span class="dot"></span>' + escH(w.status) + "</span>";
    $("#det-what").textContent = w.what;
    $("#det-hard").textContent = w.hard || "";
    $("#det-facts").innerHTML = w.facts.map((f) => "<li>" + escH(f) + "</li>").join("");
    $("#det-facts-h").hidden = !w.facts.length;
    $("#det-stack").textContent = w.stack.join(" · ");
    $("#det-acts").innerHTML = (w.url ? '<a class="btn btn-ink sm" href="' + escH(w.url) + '" target="_blank" rel="noopener">' + escH(w.cta) + ' <span aria-hidden="true">↗</span></a>' : "") +
      '<a class="btn btn-line sm" href="#contact" data-close>Build me one like this</a>' +
      (w.note ? '<p class="mono item-kind" style="flex-basis:100%">' + escH(w.note) + "</p>" : "");
    $("#det-thumbs").innerHTML = w.images.length > 1 ? w.images.map((im, k) => '<button type="button" data-shot="' + k + '" aria-label="Screen ' + (k + 1) + ": " + escH(im.c) + '"><img src="assets/work/' + escH(im.f) + '" alt="" loading="lazy"></button>').join("") : "";
    det.dataset.slug = slug;
    showShot(w, 0);
    det.showModal();
    $("#det-x").focus();
  };
  const canExit = () => window.CSS && CSS.supports("overlay", "auto");
  const closeDet = async () => {
    if (!det.open) return;
    if (!reduced && !canExit()) {
      det.setAttribute("data-closing", "");
      const an = det.getAnimations({ subtree: true });
      if (an.length) await Promise.race([Promise.allSettled(an.map((a) => a.finished)), new Promise((r) => setTimeout(r, 400))]);
      det.removeAttribute("data-closing");
    }
    det.close();
  };
  if (det) {
    det.addEventListener("close", () => { if (lastOpener && document.contains(lastOpener)) lastOpener.focus({ preventScroll: true }); });
    det.addEventListener("cancel", (e) => { e.preventDefault(); closeDet(); });
    $("#det-x").addEventListener("click", closeDet);
    det.addEventListener("click", (e) => {
      const shot = e.target.closest("[data-shot]");
      if (shot) { showShot(bySlug[det.dataset.slug], +shot.dataset.shot); return; }
      if (e.target.closest("[data-close]")) { closeDet(); return; }
      if (e.target === det && !("closedBy" in HTMLDialogElement.prototype)) {
        const r = det.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDet();
      }
    });
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-open]");
    if (!b || b.closest("dialog")) return;
    e.preventDefault();
    openDet(b.dataset.open, b);
  });

  const grid = $("#cat-grid");
  if (grid) {
    const items = $$(".item", grid);
    const chips = $$("[data-filter]");
    const liveBtn = $("[data-live]");
    const countEl = $("#cat-count");
    let group = "all", liveOnly = false;
    const apply = () => {
      let shown = 0, open = 0;
      items.forEach((it) => {
        const ok = (group === "all" || it.dataset.group === group) && (!liveOnly || it.hasAttribute("data-openable"));
        it.hidden = !ok;
        if (ok) { shown++; if (it.hasAttribute("data-openable")) open++; it.classList.add("in"); }
      });
      if (countEl) countEl.textContent = shown + (shown === 1 ? " system" : " systems") + " · " + open + " you can open right now";
    };
    const run = () => (!reduced && document.startViewTransition ? document.startViewTransition(apply) : apply());
    chips.forEach((c) => c.addEventListener("click", () => {
      group = c.dataset.filter;
      chips.forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
      run();
    }));
    if (liveBtn) liveBtn.addEventListener("click", () => {
      liveOnly = !liveOnly;
      liveBtn.setAttribute("aria-pressed", String(liveOnly));
      run();
    });
  }

  const ex = $("#exhibit");
  if (ex) {
    const sets = $$(".ex-set", ex);
    const dots = $$("[data-go]", ex);
    const nameEl = $("#ex-name");
    const openBtn = $("#ex-open");
    const pauseBtn = $("#ex-pause");
    let cur = 0, timer = 0, paused = reduced, hover = false;
    const show = (i) => {
      cur = (i + sets.length) % sets.length;
      const s = sets[cur];
      $$("img[loading]", s).forEach((im) => im.removeAttribute("loading"));
      const nx = sets[(cur + 1) % sets.length];
      if (nx) $$("img[loading]", nx).forEach((im) => im.removeAttribute("loading"));
      sets.forEach((x, k) => x.classList.toggle("on", k === cur));
      dots.forEach((d, k) => d.setAttribute("aria-current", String(k === cur)));
      nameEl.innerHTML = escH(s.dataset.name) + (s.dataset.bn ? ' <span lang="bn">' + escH(s.dataset.bn) + "</span>" : "") + "<small>" + escH(s.dataset.kind) + "</small>";
      openBtn.dataset.open = s.dataset.slug;
    };
    const arm = () => {
      clearInterval(timer);
      if (!paused && !hover && !document.hidden) timer = setInterval(() => show(cur + 1), 5200);
    };
    const setPaused = (p) => {
      paused = p;
      pauseBtn.setAttribute("aria-pressed", String(p));
      pauseBtn.setAttribute("aria-label", p ? "Play the slideshow" : "Pause the slideshow");
      pauseBtn.innerHTML = p ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>' : '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.4" height="12" rx="1"/><rect x="9.6" y="2" width="3.4" height="12" rx="1"/></svg>';
      arm();
    };
    dots.forEach((d) => d.addEventListener("click", () => { show(+d.dataset.go); arm(); }));
    pauseBtn.addEventListener("click", () => setPaused(!paused));
    ex.addEventListener("pointerenter", () => { hover = true; arm(); });
    ex.addEventListener("pointerleave", () => { hover = false; arm(); });
    ex.addEventListener("focusin", () => { hover = true; arm(); });
    ex.addEventListener("focusout", () => { hover = false; arm(); });
    document.addEventListener("visibilitychange", arm);
    $(".ex-stage", ex).addEventListener("click", () => openDet(sets[cur].dataset.slug, openBtn));
    setPaused(paused);
  }

  const svg = $(".till-svg");
  const slipsG = $("#till-slips");
  const qText = $("#till-q"), qLabel = $("#till-q-l");
  const okText = $("#till-ok");
  const linkPath = $("#till-link");
  const linkLabel = $("#till-link-l");
  const pkt = $("#till-pkt");
  const log = $("#till-log");
  const saleBtn = $("#till-sale");
  const netBtn = $("#till-net");

  const state = { online: true, seq: 112, synced: 12, queue: [], slips: [], busy: 0 };
  const amounts = [120, 340, 85, 560, 210, 45, 780, 150, 95, 430];

  const say = (text, cls) => {
    const li = document.createElement("li");
    li.textContent = text;
    if (cls) li.className = cls;
    log.prepend(li);
    while (log.children.length > 4) log.lastElementChild.remove();
  };

  const drawSlips = () => {
    slipsG.replaceChildren();
    state.slips.slice(-5).forEach((s, i) => {
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "slip " + s.st);
      g.setAttribute("transform", "translate(0 " + i * 28 + ")");
      if (!s.fresh) g.style.animation = "none";
      s.fresh = false;
      const r = document.createElementNS(NS, "rect");
      r.setAttribute("width", "110"); r.setAttribute("height", "22"); r.setAttribute("rx", "2");
      const a = document.createElementNS(NS, "text");
      a.setAttribute("x", "7"); a.setAttribute("y", "15");
      a.textContent = "#" + String(s.id).padStart(4, "0") + " Tk" + s.amt;
      const b = document.createElementNS(NS, "text");
      b.setAttribute("x", "103"); b.setAttribute("y", "15"); b.setAttribute("text-anchor", "end");
      b.textContent = s.st === "q" ? "WAIT" : s.st === "bad" ? "NO" : "OK";
      g.append(r, a, b);
      slipsG.append(g);
    });
  };

  const drawCounts = () => {
    const n = state.queue.length;
    qText.textContent = n;
    qLabel.textContent = n ? "waiting" : "empty";
    okText.textContent = "SYNCED " + state.synced;
  };

  const fly = (bad) => new Promise((resolve) => {
    if (reduced) return resolve();
    const len = linkPath.getTotalLength();
    const dur = 520;
    const t0 = performance.now();
    pkt.classList.toggle("bad", !!bad);
    const step = (now) => {
      const k = Math.min(1, (now - t0) / (bad ? dur * 1.6 : dur));
      const u = bad ? (k < .5 ? k * 2 : 2 - k * 2) : k;
      const e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      const p = linkPath.getPointAtLength(e * len);
      pkt.setAttribute("cx", p.x);
      pkt.setAttribute("cy", p.y);
      if (k < 1) requestAnimationFrame(step);
      else { pkt.setAttribute("cx", -20); pkt.setAttribute("cy", -20); resolve(); }
    };
    requestAnimationFrame(step);
  });

  const setNet = (online, reason) => {
    if (state.online === online) return;
    state.online = online;
    svg.classList.toggle("down", !online);
    netBtn.setAttribute("aria-pressed", String(!online));
    netBtn.textContent = online ? "Cut the line" : "Restore the line";
    linkLabel.textContent = online ? "LINE · UP" : "LINE · DOWN";
    if (!online) {
      say(reason || "Line down. The till keeps selling.", "q");
    } else {
      flush(reason);
    }
  };

  const flush = async (reason) => {
    const n = state.queue.length;
    if (!n) { say(reason || "Line back. Nothing was waiting.", "ok"); return; }
    say((reason || "Line back.") + " Sending " + n + " waiting " + (n === 1 ? "sale." : "sales."), "ok");
    if (state.busy) return;
    state.busy = 1;
    let sent = 0;
    while (state.online && state.queue.length) {
      const s = state.queue[0];
      const refuse = sent === 1;
      await fly(refuse);
      state.queue.shift();
      sent++;
      if (refuse) {
        s.st = "bad";
        say("Sale #" + String(s.id).padStart(4, "0") + " refused (409): T-02 sold the last box first. Shown to the cashier.", "bad");
      } else {
        s.st = "ok";
        state.synced++;
        say("Sale #" + String(s.id).padStart(4, "0") + " synced.", "ok");
      }
      drawSlips();
      drawCounts();
    }
    state.busy = 0;
  };

  saleBtn.addEventListener("click", async () => {
    const s = { id: ++state.seq, amt: amounts[state.seq % amounts.length], st: state.online ? "ok" : "q", fresh: true };
    state.slips.push(s);
    if (state.slips.length > 12) state.slips.shift();
    if (state.online) {
      s.st = "q";
      drawSlips();
      await fly(false);
      s.st = "ok";
      state.synced++;
      say("Sale #" + String(s.id).padStart(4, "0") + " sent · " + (24 + Math.floor(Math.random() * 40)) + " ms", "ok");
    } else {
      state.queue.push(s);
      say("Sale #" + String(s.id).padStart(4, "0") + " saved on the device. Waiting for the line.", "q");
    }
    drawSlips();
    drawCounts();
  });

  netBtn.addEventListener("click", () => setNet(!state.online));

  [[108, 340, "ok"], [109, 85, "ok"], [110, 560, "ok"], [111, 210, "ok"], [112, 45, "ok"]].forEach(([id, amt, st]) => state.slips.push({ id, amt, st }));
  drawSlips();
  drawCounts();

  const strip = $("#offline");
  const onNet = () => {
    const up = navigator.onLine;
    strip.hidden = up;
    setNet(up, up ? "Your connection is back." : "Your own connection just dropped. The till keeps selling.");
  };
  addEventListener("online", onNet);
  addEventListener("offline", onNet);
  if (!navigator.onLine) onNet();

  if (!reduced && "IntersectionObserver" in window) {
    const targets = $$(".case, .item, .steps li, .rules li, .offer, .terms div");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    targets.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight) return;
      const sibs = [...el.parentElement.children];
      el.style.transitionDelay = (sibs.indexOf(el) % 3) * 70 + "ms";
      el.classList.add("reveal");
      io.observe(el);
    });
  }

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();

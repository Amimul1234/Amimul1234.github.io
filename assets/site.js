(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

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

  const toast = $("#toast");
  let toastTimer;
  const say = (msg) => {
    toast.textContent = msg;
    toast.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("on"), 1800);
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.append(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (err) {}
      ta.remove();
      return ok;
    }
  };

  document.addEventListener("click", async (e) => {
    const chip = e.target.closest("[data-copy]");
    if (!chip) return;
    const ok = await copyText(chip.dataset.copy);
    if (ok) {
      chip.classList.add("done");
      setTimeout(() => chip.classList.remove("done"), 1600);
      say("Copied: " + chip.dataset.copy);
    } else {
      say("Login: " + chip.dataset.copy);
    }
  });

  const grid = $("#grid");
  const cards = $$(".card", grid);
  const q = $("#q");
  const count = $("#count");
  const empty = $("#empty");
  const chips = $$(".fchip[data-f]");
  const liveBtn = $("[data-live-toggle]");
  let ind = "all";
  let liveOnly = false;

  const norm = (s) => s.toLowerCase().normalize("NFC").trim();

  const apply = () => {
    const terms = norm(q.value).split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const c of cards) {
      const hay = c.dataset.q;
      const ok = (ind === "all" || c.dataset.ind === ind)
        && (!liveOnly || c.dataset.live === "1")
        && terms.every((t) => hay.includes(t));
      c.hidden = !ok;
      if (ok) shown++;
    }
    empty.hidden = shown > 0;
    count.textContent = shown === cards.length
      ? `Showing all ${cards.length} systems`
      : `Showing ${shown} of ${cards.length} systems`;
  };

  for (const b of chips) {
    b.addEventListener("click", () => {
      ind = b.dataset.f;
      for (const o of chips) o.setAttribute("aria-pressed", String(o === b));
      apply();
    });
  }
  liveBtn.addEventListener("click", () => {
    liveOnly = !liveOnly;
    liveBtn.setAttribute("aria-pressed", String(liveOnly));
    apply();
  });
  q.addEventListener("input", apply);
  $("#reset").addEventListener("click", () => {
    q.value = "";
    ind = "all";
    liveOnly = false;
    for (const o of chips) o.setAttribute("aria-pressed", String(o.dataset.f === "all"));
    liveBtn.setAttribute("aria-pressed", "false");
    apply();
  });
  apply();

  for (const d of $$("dialog.sheet")) {
    d.addEventListener("close", () => {
      const back = $(`[commandfor="${d.id}"][command="show-modal"]`);
      if (back && document.activeElement === document.body) back.focus({ preventScroll: true });
    });
  }

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();

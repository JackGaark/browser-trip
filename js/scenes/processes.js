import { $ } from "../core/utils.js";

export const initProcesses = ({ sound }) => {
  const SITE_COL = {
    "shop.example": "#d9573f",
    "mail.example": "#2f5fb3",
    "news.example": "#2f7d4f",
    "maps.example": "#8a5bc2",
    "ads.example": "#b8860b",
  };
  let tabs = [
      { id: 1, site: "shop.example", frame: null },
      { id: 2, site: "mail.example", frame: null },
    ],
    activeTab = 1,
    tabSeq = 2,
    crashed = new Set(),
    seenRenderers = new Set();
  function renderers() {
    const m = new Map();
    tabs.forEach((t) => {
      if (!m.has(t.site)) m.set(t.site, []);
      m.get(t.site).push(`tab ${t.id}`);
      if (t.frame) {
        if (!m.has(t.frame)) m.set(t.frame, []);
        m.get(t.frame).push(`iframe in tab ${t.id}`);
      }
    });
    return m;
  }
  function renderProc() {
    const R = renderers();
    $("#tabs").innerHTML = tabs
      .map(
        (t) =>
          `<span class="tabbtn${t.id === activeTab ? " on" : ""}"><button type="button" role="tab" aria-selected="${t.id === activeTab}" data-tab="${t.id}">${t.site}</button><button type="button" class="x" aria-label="Close ${t.site} tab" data-close="${t.id}">×</button></span>`,
      )
      .join("");
    const t = tabs.find((x) => x.id === activeTab);
    const view = $("#tabView");
    if (!t)
      view.innerHTML = `<p class="note">No tabs open. Open one with the buttons on the left.</p>`;
    else if (crashed.has(t.site))
      view.innerHTML = `<div class="sad"><b>This tab’s renderer process crashed.</b><span>The other tabs kept running, because each site lives in its own process.</span><button type="button" class="btn sm" data-reload="${t.site}">Reload</button></div>`;
    else
      view.innerHTML =
        `<div class="site-h" style="background:${SITE_COL[t.site]}">${t.site}</div><div class="site-l" style="width:80%"></div><div class="site-l" style="width:64%"></div>` +
        (t.frame
          ? crashed.has(t.frame)
            ? `<div class="iframe" style="border-color:var(--bad)"><b style="color:var(--bad)">This frame crashed.</b><span>The ${t.site} page around it is fine.</span></div>`
            : `<div class="iframe"><span>iframe · ${t.frame}</span><div class="site-l" style="width:50%;background:#e8d39a"></div></div>`
          : "") +
        `<div class="site-l" style="width:72%"></div>`;
    const fixed = [
      ["hall", "Browser process", "window, tabs, address bar"],
      ["factory", "GPU process", "composites every frame"],
      ["tower", "Network service", "fetches for everyone"],
    ];
    $("#town").innerHTML =
      fixed
        .map(
          ([ic, n, s]) =>
            `<div class="proc"><svg viewBox="0 0 80 70" aria-hidden="true"><use href="#${ic}"/></svg><b>${n}</b><small>${s}</small></div>`,
        )
        .join("") +
      [...R.entries()]
        .map(([site, users]) => {
          const isNew = !seenRenderers.has(site);
          seenRenderers.add(site);
          const c = crashed.has(site);
          return `<div class="proc renderer${c ? " crashed" : ""}${isNew ? " new" : ""}"><svg viewBox="0 0 80 70" aria-hidden="true"><use href="#house"/></svg><b>Renderer · ${site}</b><small>${users.join(", ")}${c ? " · crashed" : ""}</small>${c ? `<button type="button" class="btn sm" data-reload="${site}">Restart</button>` : `<button type="button" class="btn sm" data-crash="${site}">Crash it</button>`}</div>`;
        })
        .join("");
    $("#procMsg").textContent =
      `${3 + R.size} processes running: 3 shared, plus ${R.size} renderer${R.size === 1 ? "" : "s"}, one per site.`;
  }
  $("#s-proc").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.open) {
      if (tabs.length >= 5) {
        $("#procMsg").textContent =
          "That’s enough tabs for this demo. Close one first.";
        return;
      }
      const site = b.dataset.open,
        id = ++tabSeq;
      tabs.push({ id, site, frame: null });
      activeTab = id;
      sound.cue.blip(600 + tabs.length * 60);
      renderProc();
      $("#procMsg").textContent +=
        renderers().get(site).length > 1
          ? ` ${site} already had a renderer, so the new tab shares it.`
          : ` ${site} got a brand-new renderer.`;
    } else if (b.id === "addFrame") {
      const t = tabs.find((x) => x.id === activeTab);
      if (!t) return;
      if (t.frame) {
        $("#procMsg").textContent = "This tab already has an ad iframe.";
        return;
      }
      t.frame = "ads.example";
      sound.cue.blip(880);
      renderProc();
      $("#procMsg").textContent =
        `ads.example is a different site from ${t.site}, so its iframe runs in a separate renderer. The page can’t read the ad’s memory, and the ad can’t read the page’s.`;
    } else if (b.dataset.tab) {
      activeTab = +b.dataset.tab;
      sound.cue.tick(800);
      renderProc();
    } else if (b.dataset.close) {
      tabs = tabs.filter((x) => x.id !== +b.dataset.close);
      if (activeTab === +b.dataset.close) activeTab = tabs[0]?.id;
      sound.cue.tick(500);
      const R = renderers();
      [...crashed].forEach((s) => {
        if (!R.has(s)) crashed.delete(s);
      });
      [...seenRenderers].forEach((s) => {
        if (!R.has(s)) seenRenderers.delete(s);
      });
      renderProc();
    } else if (b.dataset.crash) {
      crashed.add(b.dataset.crash);
      sound.cue.thud();
      renderProc();
      $("#procMsg").textContent =
        `The ${b.dataset.crash} renderer crashed. Switch tabs: everything else still works.`;
    } else if (b.dataset.reload) {
      crashed.delete(b.dataset.reload);
      sound.cue.good();
      renderProc();
    }
  });
  renderProc();
};

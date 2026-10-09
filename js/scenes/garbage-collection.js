import { $, $$, S, sleep, onResize } from "../core/utils.js";

export const initGarbageCollection = ({ sound }) => {
  const gcHost = $("#gcSvg");
  let gid = 0,
    objs = new Map(),
    edges = [],
    gcBusy = false,
    gcL = null;
  const ROOTS = ["window", "stack"];
  function gcInit() {
    gid = 0;
    objs = new Map();
    edges = [];
    const mk = (gen, slot, age = 0) => {
      const id = ++gid;
      objs.set(id, { id, gen, slot, age });
      return id;
    };
    const a = mk("young", 0),
      b = mk("young", 1),
      c = mk("young", 2),
      d = mk("young", 5),
      e = mk("young", 6),
      f = mk("old", 0, 2),
      g = mk("old", 3, 2);
    edges = [
      ["window", a],
      [a, b],
      ["stack", c],
      [d, e],
      ["window", f],
      [f, b],
    ];
    void g;
  }
  function gcLayout() {
    const W = Math.max(300, gcHost.clientWidth),
      wide = W >= 560;
    const H = wide ? 360 : 560,
      rootsY = 30;
    const young = wide
      ? { x: 6, y: 70, w: W / 2 - 12, h: H - 78 }
      : { x: 6, y: 70, w: W - 12, h: 228 };
    const old = wide
      ? { x: W / 2 + 6, y: 70, w: W / 2 - 12, h: H - 78 }
      : { x: 6, y: 318, w: W - 12, h: 228 };
    const slot = (reg, k) => ({
      x: reg.x + (((k % 4) + 0.5) * reg.w) / 4,
      y: reg.y + 40 + ((Math.floor(k / 4) + 0.5) * (reg.h - 48)) / 3,
    });
    const rootPos = {
      window: { x: W * 0.3, y: rootsY },
      stack: { x: W * 0.7, y: rootsY },
    };
    return { W, H, young, old, slot, rootPos };
  }
  const posOf = (k) =>
    typeof k === "string"
      ? gcL.rootPos[k]
      : gcL.slot(
          objs.get(k).gen === "young" ? gcL.young : gcL.old,
          objs.get(k).slot,
        );
  function reachable() {
    const seen = new Set(),
      order = [],
      q = [...ROOTS];
    while (q.length) {
      const k = q.shift();
      for (const [a, b] of edges)
        if (a === k && objs.has(b) && !seen.has(b)) {
          seen.add(b);
          order.push(b);
          q.push(b);
        }
    }
    return { seen, order };
  }
  function drawGc(marked = new Set(), cut = null) {
    gcL = gcLayout();
    const { W, H, young, old } = gcL;
    gcHost.innerHTML = "";
    const svg = S(
      "svg",
      {
        viewBox: `0 0 ${W} ${H}`,
        width: W,
        height: H,
        class: "fig",
        role: "img",
        "aria-label": `Heap with ${objs.size} objects: ${[...objs.values()].filter((o) => o.gen === "young").length} young and ${[...objs.values()].filter((o) => o.gen === "old").length} old.`,
      },
      gcHost,
    );
    const defs = S("defs", {}, svg),
      m = S(
        "marker",
        {
          id: "gcA",
          viewBox: "0 0 10 10",
          refX: 9,
          refY: 5,
          markerWidth: 6,
          markerHeight: 6,
          orient: "auto-start-reverse",
        },
        defs,
      );
    S("path", { d: "M0,0 L10,5 L0,10 z", class: "mk-ink" }, m);
    [
      [young, "nursery (young)"],
      [old, "old generation"],
    ].forEach(([r, l]) => {
      S(
        "rect",
        { x: r.x, y: r.y, width: r.w, height: r.h, rx: 14, class: "region" },
        svg,
      );
      S("text", { x: r.x + 12, y: r.y + 26, class: "region-l" }, svg, l);
    });
    edges.forEach(([a, b]) => {
      if (!objs.has(b) || (typeof a !== "string" && !objs.has(a))) return;
      const p = posOf(a),
        q = posOf(b),
        dx = q.x - p.x,
        dy = q.y - p.y,
        len = Math.hypot(dx, dy) || 1;
      const sx = p.x + (dx / len) * 20,
        sy = p.y + (dy / len) * 18,
        ex = q.x - (dx / len) * 24,
        ey = q.y - (dy / len) * 20;
      const mx = (sx + ex) / 2 - dy * 0.12,
        my = (sy + ey) / 2 + dx * 0.12;
      S(
        "path",
        {
          d: `M${sx} ${sy} Q${mx} ${my} ${ex} ${ey}`,
          class: "edge" + (cut && cut[0] === a && cut[1] === b ? " cut" : ""),
          "marker-end": "url(#gcA)",
        },
        svg,
      );
    });
    ROOTS.forEach((k) => {
      const p = gcL.rootPos[k],
        g = S("g", { class: "root" + (marked.size ? " mark" : "") }, svg);
      S("rect", { x: p.x - 36, y: p.y - 14, width: 72, height: 28, rx: 14 }, g);
      S("text", { x: p.x, y: p.y + 4, "text-anchor": "middle" }, g, k);
    });
    for (const o of objs.values()) {
      const p = posOf(o.id),
        g = S(
          "g",
          {
            class: `blob ${o.gen}${marked.has(o.id) ? " mark" : ""}`,
            "data-id": o.id,
            transform: `translate(${p.x},${p.y})`,
          },
          svg,
        );
      S("rect", { x: -20, y: -17, width: 40, height: 34, rx: 11 }, g);
      S("circle", { cx: -7, cy: -3, r: 2.6, fill: "#2a2420" }, g);
      S("circle", { cx: 7, cy: -3, r: 2.6, fill: "#2a2420" }, g);
      S(
        "path",
        {
          d: "M-4 5 q4 3 8 0",
          stroke: "#2a2420",
          "stroke-width": 1.6,
          fill: "none",
          "stroke-linecap": "round",
        },
        g,
      );
      S(
        "text",
        { x: 0, y: 30, "text-anchor": "middle" },
        g,
        `#${o.id}${o.gen === "young" ? " · age " + o.age : ""}`,
      );
    }
    const { seen } = reachable();
    const garbage = [...objs.keys()].filter((k) => !seen.has(k)).length;
    $("#gcStats").innerHTML =
      `<span><b>${objs.size - garbage}</b>reachable</span><span><b>${garbage}</b>garbage</span><span><b>${[...objs.values()].filter((o) => o.gen === "old").length}</b>in old generation</span>`;
    return svg;
  }
  const freeSlot = (gen) => {
    const used = new Set(
      [...objs.values()].filter((o) => o.gen === gen).map((o) => o.slot),
    );
    for (let k = 0; k < 12; k++) if (!used.has(k)) return k;
    return -1;
  };
  async function collect(kind) {
    const { seen, order } = reachable();
    const msg = $("#gcMsg");
    msg.textContent = "Marking: following references from the roots…";
    const marked = new Set();
    drawGc(marked);
    for (const id of order) {
      if (kind === "minor" && objs.get(id).gen === "old") {
        marked.add(id);
        continue;
      }
      marked.add(id);
      drawGc(marked);
      sound.cue.tick(700 + marked.size * 60, 0, 0.04);
      await sleep(170);
    }
    const doomed = [...objs.values()].filter(
      (o) => !seen.has(o.id) && (kind === "major" || o.gen === "young"),
    );
    const svg = drawGc(marked);
    doomed.forEach((o) => {
      const el = svg.querySelector(`.blob[data-id="${o.id}"]`);
      if (el) el.classList.add("gone");
    });
    if (doomed.length) sound.cue.pop();
    else sound.cue.blip(400);
    await sleep(500);
    doomed.forEach((o) => objs.delete(o.id));
    edges = edges.filter(
      ([a, b]) => objs.has(b) && (typeof a === "string" || objs.has(a)),
    );
    let promoted = 0;
    if (kind === "minor")
      for (const o of objs.values()) {
        if (o.gen !== "young") continue;
        o.age++;
        if (o.age >= 2) {
          const s = freeSlot("old");
          if (s >= 0) {
            o.gen = "old";
            o.slot = s;
            promoted++;
          }
        }
      }
    drawGc();
    if (promoted) sound.cue.note("G", 0, 0.4);
    msg.textContent = `${kind === "minor" ? "Minor GC swept the nursery" : "Major GC swept the whole heap"}: freed ${doomed.length} object${doomed.length === 1 ? "" : "s"}${promoted ? `, promoted ${promoted} survivor${promoted === 1 ? "" : "s"} to the old generation` : ""}.${kind === "minor" && [...objs.values()].some((o) => o.gen === "old" && !reachable().seen.has(o.id)) ? " Some unreachable objects remain in the old generation; only a major GC frees those." : ""}`;
  }
  async function guard(fn) {
    if (gcBusy) return;
    gcBusy = true;
    $$("#s-gc .btn").forEach((b) => (b.disabled = true));
    try {
      await fn();
    } finally {
      gcBusy = false;
      $$("#s-gc .btn").forEach((b) => (b.disabled = false));
    }
  }
  $("#gcAlloc").addEventListener("click", () =>
    guard(async () => {
      if (freeSlot("young") < 0) {
        $("#gcMsg").textContent =
          "The nursery is full, so a minor GC runs first.";
        await sleep(500);
        await collect("minor");
      }
      const s = freeSlot("young");
      if (s < 0) {
        $("#gcMsg").textContent =
          "Still full: everything in the nursery is reachable. Drop some references first.";
        sound.cue.bad();
        return;
      }
      const id = ++gid;
      objs.set(id, { id, gen: "young", slot: s, age: 0 });
      const { seen } = reachable(),
        pool = [...ROOTS, ...seen];
      const from = pool[Math.floor(Math.random() * pool.length)];
      edges.push([from, id]);
      drawGc();
      sound.cue.blip(660 + (id % 6) * 60);
      $("#gcMsg").textContent =
        `Created object #${id}, referenced from ${typeof from === "string" ? from : "#" + from}.`;
    }),
  );
  $("#gcDrop").addEventListener("click", () =>
    guard(async () => {
      if (!edges.length) {
        $("#gcMsg").textContent = "No references left to drop.";
        return;
      }
      const e = edges[Math.floor(Math.random() * edges.length)];
      drawGc(new Set(), e);
      sound.tone(300, { dur: 0.2, slide: 0.5, gain: 0.06, type: "triangle" });
      await sleep(600);
      edges = edges.filter((x) => x !== e);
      drawGc();
      const lost = [...objs.keys()].filter(
        (k) => !reachable().seen.has(k),
      ).length;
      $("#gcMsg").textContent =
        `${typeof e[0] === "string" ? e[0] : "#" + e[0]} no longer points to #${e[1]}. ${lost} object${lost === 1 ? " is" : "s are"} now unreachable, but nothing is freed until the collector runs.`;
    }),
  );
  $("#gcMinor").addEventListener("click", () => guard(() => collect("minor")));
  $("#gcMajor").addEventListener("click", () => guard(() => collect("major")));
  gcInit();
  onResize(gcHost, () => drawGc());
  drawGc();
  $("#gcMsg").textContent =
    "Objects #4 and #5 aren’t reachable from any root. #7 sits in the old generation, unreferenced.";
};

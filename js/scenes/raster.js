import { canvasFont } from "../core/utils.js";
import { $, tween, onResize } from "../core/utils.js";

export const initRaster = ({ sound }) => {
  const RC = { cols: 8, rows: 10, vh: 4 },
    WCOL = ["#ffb35c", "#7fd4ff", "#7be0a6", "#d7b4ff"];
  const rcv = $("#rcv"),
    rctx = rcv.getContext("2d"),
    rHost = $("#rHost");
  let tile = 40,
    rTop = 0,
    rDone = new Set(),
    rProg = new Map(),
    rRun = 0,
    pageCv = null;
  function rSize() {
    tile = Math.max(26, Math.floor(Math.min(rHost.clientWidth / RC.cols, 46)));
    const w = tile * RC.cols,
      h = tile * RC.rows,
      dpr = devicePixelRatio || 1;
    rcv.style.width = w + "px";
    rcv.style.height = h + "px";
    rcv.width = w * dpr;
    rcv.height = h * dpr;
    rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pageCv = document.createElement("canvas");
    pageCv.width = w;
    pageCv.height = h;
    const c = pageCv.getContext("2d");
    c.fillStyle = "#fffdf8";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#2f5fb3";
    c.fillRect(0, 0, w, tile * 0.8);
    c.fillStyle = "#fff";
    c.font = `bold ${Math.round(tile * 0.38)}px ${canvasFont}`;
    c.fillText("hello, web", tile * 0.3, tile * 0.55);
    const g = c.createLinearGradient(0, tile, 0, tile * 3.6);
    g.addColorStop(0, "#9fd0ef");
    g.addColorStop(1, "#fbe7b5");
    c.fillStyle = g;
    c.fillRect(tile * 0.3, tile * 1.1, w - tile * 0.6, tile * 2.5);
    c.fillStyle = "#f5d06f";
    c.beginPath();
    c.arc(w - tile * 1.5, tile * 1.8, tile * 0.4, 0, 7);
    c.fill();
    for (let r = 4; r < RC.rows; r++) {
      if (r % 3 === 1) {
        c.fillStyle = "#f3ead5";
        c.fillRect(tile * 0.3, r * tile + 4, w * 0.45, tile * 2.4);
        c.fillStyle = "#fbe7b5";
        c.fillRect(w * 0.52, r * tile + 4, w * 0.45, tile * 2.4);
      }
      c.fillStyle = "#c9bfae";
      for (let k = 0; k < 3; k++)
        c.fillRect(
          tile * 0.6,
          r * tile + tile * (0.25 + k * 0.25),
          (w - tile * 1.2) * (k === 2 ? 0.6 : 0.9),
          3,
        );
    }
  }
  function inView(i) {
    const r = Math.floor(i / RC.cols);
    return r >= rTop && r < rTop + RC.vh;
  }
  function drawR() {
    const w = tile * RC.cols,
      h = tile * RC.rows;
    rctx.clearRect(0, 0, w, h);
    for (let i = 0; i < RC.cols * RC.rows; i++) {
      const x = (i % RC.cols) * tile,
        y = Math.floor(i / RC.cols) * tile;
      if (rDone.has(i))
        rctx.drawImage(pageCv, x, y, tile, tile, x, y, tile, tile);
      else {
        if (inView(i)) {
          const q = tile / 4;
          for (let a = 0; a < 4; a++)
            for (let b = 0; b < 4; b++) {
              rctx.fillStyle = (a + b) % 2 ? "#c7cfdf" : "#e9edf5";
              rctx.fillRect(x + a * q, y + b * q, q, q);
            }
        } else {
          rctx.fillStyle = "#132a5a";
          rctx.fillRect(x, y, tile, tile);
        }
        const p = rProg.get(i);
        if (p) {
          rctx.drawImage(
            pageCv,
            x,
            y,
            tile,
            tile * p.k,
            x,
            y,
            tile,
            tile * p.k,
          );
          rctx.fillStyle = WCOL[p.w];
          rctx.beginPath();
          rctx.arc(x + tile - 7, y + 7, 4.5, 0, 7);
          rctx.fill();
          rctx.strokeStyle = WCOL[p.w];
          rctx.lineWidth = 2;
          rctx.strokeRect(x + 1, y + 1, tile - 2, tile - 2);
        }
      }
      rctx.strokeStyle = "rgba(127,160,230,.28)";
      rctx.lineWidth = 1;
      rctx.strokeRect(x + 0.5, y + 0.5, tile - 1, tile - 1);
    }
    rctx.strokeStyle = "#ffb35c";
    rctx.lineWidth = 3;
    rctx.strokeRect(1.5, rTop * tile + 1.5, w - 3, RC.vh * tile - 3);
    rctx.fillStyle = "#ffb35c";
    rctx.fillRect(4, rTop * tile + 4, 66, 16);
    rctx.fillStyle = "#1d1404";
    rctx.font = "600 10px 'JetBrains Mono', monospace";
    rctx.fillText("viewport", 9, rTop * tile + 15);
    const missing = [...Array(RC.cols * RC.rows).keys()].filter(
      (i) => inView(i) && !rDone.has(i),
    ).length;
    $("#rSum").textContent =
      `${rDone.size} of ${RC.cols * RC.rows} tiles rastered.${missing ? ` ${missing} tiles in view are still checkerboard.` : " Everything in view is ready."}`;
  }
  function rasterAll() {
    const run = ++rRun;
    const pick = () => {
      const free = [...Array(RC.cols * RC.rows).keys()].filter(
        (i) => !rDone.has(i) && !rProg.has(i),
      );
      const pr = (i) => {
        const r = Math.floor(i / RC.cols);
        return r < rTop
          ? rTop - r
          : r >= rTop + RC.vh
            ? r - (rTop + RC.vh - 1)
            : 0;
      };
      free.sort((a, b) => pr(a) - pr(b) || a - b);
      return free[0];
    };
    const worker = async (w) => {
      while (run === rRun) {
        const next = pick();
        if (next === undefined) return;
        rProg.set(next, { w, k: 0 });
        const ok = await tween(
          230,
          (e) => {
            const p = rProg.get(next);
            if (p) {
              p.k = e;
              drawR();
            }
          },
          () => run === rRun,
        );
        rProg.delete(next);
        if (!ok) return;
        rDone.add(next);
        sound.cue.tick(520 + w * 160, 0, 0.022);
        drawR();
      }
    };
    Promise.all([0, 1, 2, 3].map(worker)).then(() => {
      if (run === rRun) sound.cue.good();
    });
  }
  $("#rGo").addEventListener("click", () => {
    rRun++;
    rDone = new Set();
    rProg = new Map();
    rTop = 0;
    drawR();
    rasterAll();
  });
  $("#rScroll").addEventListener("click", () => {
    rTop = rTop + 3 > RC.rows - RC.vh ? 0 : rTop + 3;
    sound.cue.blip(400);
    drawR();
    if (![...rProg.keys()].length) rasterAll();
  });
  onResize(rHost, () => {
    rSize();
    drawR();
  });
  rSize();
  for (let i = 0; i < RC.cols * RC.rows; i++) rDone.add(i);
  drawR();
  // Frame counter: real frames composited while the scene is on screen.
  let fN = 0,
    fVis = false,
    fLast = 0;
  const fTick = (t) => {
    fN++;
    $("#fClock").textContent =
      `Frames composited while you’ve been here: ${fN.toLocaleString()} (last one took ${(t - fLast).toFixed(1)} ms of a 16.7 ms budget)`;
    $("#fBar").style.width =
      Math.min(100, ((t - fLast) / 16.7) * 100).toFixed(1) + "%";
    fLast = t;
    if (fVis) requestAnimationFrame(fTick);
  };
  new IntersectionObserver((es) => {
    const v = es[0].isIntersecting;
    if (v && !fVis) {
      fVis = true;
      fLast = performance.now();
      requestAnimationFrame(fTick);
    }
    fVis = v;
  }).observe($("#s-raster"));
};

import { $, $$, S, tween, onResize } from "../core/utils.js";

export const initHttp = ({ sound }) => {
  const RES = [
    { n: "index.html", kb: 14, t: "html" },
    { n: "style.css", kb: 30, t: "css" },
    { n: "app.js", kb: 80, t: "js" },
    { n: "font.woff2", kb: 40, t: "font" },
    { n: "hero.jpg", kb: 110, t: "img" },
    { n: "logo.svg", kb: 6, t: "img" },
    { n: "icon-1.png", kb: 4, t: "img" },
    { n: "icon-2.png", kb: 4, t: "img" },
    { n: "icon-3.png", kb: 4, t: "img" },
    { n: "icon-4.png", kb: 4, t: "img" },
  ];
  const TCOL = {
    html: "#ffb35c",
    css: "#7fd4ff",
    js: "#ffe08a",
    font: "#d7b4ff",
    img: "#7be0a6",
  };
  function simulate(mode) {
    const RTT = 40,
      BW = 1.5;
    const r = RES.map((x, i) => ({
      ...x,
      i,
      left: x.kb,
      disc: i === 0 ? 0 : null,
      req: i === 0 ? 0 : null,
      start: i === 0 ? RTT : null,
      end: null,
      conn: i === 0 ? 0 : null,
    }));
    const conns = [{ ready: 0, busy: 0 }];
    let t = 0;
    while (r.some((x) => x.end === null) && t < 20000) {
      const queued = r.filter((x) => x.disc !== null && x.req === null);
      if (queued.length) {
        if (mode === "h1") {
          const free = conns.filter(
              (c) => c.busy === null && c.ready <= t,
            ).length,
            pending = conns.filter((c) => c.ready > t).length;
          let need = queued.length - free - pending;
          while (need > 0 && conns.length < 6) {
            conns.push({ ready: t + 2 * RTT, busy: null });
            need--;
          }
          for (const c of conns) {
            if (c.busy !== null || c.ready > t) continue;
            const x = r.find((y) => y.disc !== null && y.req === null);
            if (!x) break;
            c.busy = x.i;
            x.conn = conns.indexOf(c);
            x.req = t;
            x.start = t + RTT;
          }
        } else
          queued.forEach((x) => {
            x.req = t;
            x.start = t + RTT;
            x.conn = 0;
          });
      }
      const act = r.filter(
        (x) => x.start !== null && x.start <= t && x.end === null,
      );
      if (act.length) {
        const share = BW / act.length;
        for (const x of act) {
          x.left -= share;
          if (x.left <= 0) {
            x.end = t + 1;
            if (mode === "h1") conns[x.conn].busy = null;
            if (x.i === 0)
              r.forEach((y) => {
                if (y.i > 0) y.disc = t + 1;
              });
          }
        }
      }
      t++;
    }
    return { r, total: Math.max(...r.map((x) => x.end)), conns: conns.length };
  }
  const SIMS = { h1: simulate("h1"), h2: simulate("h2") };
  const httpHost = $("#httpSvg");
  let httpMode = "h2",
    httpRun = 0,
    httpT = Infinity;
  function drawHttp() {
    const W = Math.max(300, httpHost.clientWidth),
      L = W < 520 ? 84 : 98,
      R = 14,
      rowH = 25,
      top = 28;
    const sim = SIMS[httpMode],
      maxT = Math.max(SIMS.h1.total, SIMS.h2.total) + 10,
      x = (t) => L + (t / maxT) * (W - L - R);
    const H = top + RES.length * rowH + 30,
      T = httpT;
    httpHost.innerHTML = "";
    const svg = S(
      "svg",
      {
        viewBox: `0 0 ${W} ${H}`,
        width: W,
        height: H,
        class: "fig",
        role: "img",
        "aria-label": `${httpMode === "h1" ? "HTTP/1.1" : "HTTP/2"} waterfall: all files loaded at ${sim.total} milliseconds.`,
      },
      httpHost,
    );
    const step = W < 520 ? 100 : 50;
    for (let t = 0; t <= maxT; t += step) {
      S(
        "line",
        { x1: x(t), x2: x(t), y1: top - 6, y2: H - 22, class: "gridl" },
        svg,
      );
      S(
        "text",
        {
          x: x(t),
          y: top - 12,
          "text-anchor": t === 0 ? "start" : "middle",
          class: "axis",
        },
        svg,
        t === 0 ? "0 ms" : String(t),
      );
    }
    sim.r.forEach((d, i) => {
      const y = top + i * rowH;
      S(
        "text",
        { x: L - 8, y: y + 14, "text-anchor": "end", class: "rname" },
        svg,
        d.n,
      );
      if (d.disc !== null && d.req > d.disc && T > d.disc)
        S(
          "line",
          {
            x1: x(d.disc),
            x2: x(Math.min(d.req, T)),
            y1: y + 10,
            y2: y + 10,
            class: "qline",
          },
          svg,
        );
      if (d.req !== null && T > d.req)
        S(
          "line",
          {
            x1: x(d.req),
            x2: x(Math.min(d.start, T)),
            y1: y + 10,
            y2: y + 10,
            class: "wline",
          },
          svg,
        );
      if (T > d.start) {
        const e = Math.min(d.end, T),
          bw = Math.max(1.5, x(e) - x(d.start));
        S(
          "rect",
          {
            x: x(d.start),
            y: y + 4,
            width: bw,
            height: 13,
            rx: 2,
            fill: TCOL[d.t],
            opacity: T >= d.end ? 1 : 0.6,
          },
          svg,
        );
        if (httpMode === "h1" && bw > 18)
          S(
            "text",
            { x: x(d.start) + 3, y: y + 14, class: "ctag" },
            svg,
            "c" + (d.conn + 1),
          );
      }
    });
    if (T >= sim.total) {
      const lx = x(sim.total),
        right = lx < W - 130;
      S(
        "line",
        { x1: lx, x2: lx, y1: top - 4, y2: H - 22, class: "done-line" },
        svg,
      );
      S(
        "text",
        {
          x: right ? lx + 6 : lx - 6,
          y: H - 6,
          "text-anchor": right ? "start" : "end",
          class: "done-l",
        },
        svg,
        `all loaded: ${sim.total} ms`,
      );
    }
  }
  function httpSummary() {
    const a = SIMS.h1,
      b = SIMS.h2,
      s = SIMS[httpMode];
    $("#httpSum").textContent =
      httpMode === "h1"
        ? `HTTP/1.1 opened ${a.conns} connections, each paying its own handshake, and still queued files behind them. Everything arrived at ${a.total} ms.`
        : `HTTP/2 sent all nine requests at once over its single connection. Everything arrived at ${b.total} ms, ${Math.round((1 - b.total / a.total) * 100)}% sooner than HTTP/1.1.`;
    return s;
  }
  async function playHttp() {
    const run = ++httpRun,
      sim = SIMS[httpMode],
      fired = new Set();
    httpT = 0;
    await tween(
      2600,
      (e) => {
        httpT = e * (sim.total + 4);
        sim.r.forEach((d) => {
          if (d.end <= httpT && !fired.has(d.i)) {
            fired.add(d.i);
            sound.cue.tick(500 + d.i * 70, 0, 0.05);
          }
        });
        drawHttp();
      },
      () => run === httpRun,
    );
    if (run !== httpRun) return;
    httpT = Infinity;
    drawHttp();
    sound.cue.good();
    httpSummary();
  }
  $$('input[name="proto"]').forEach((r) =>
    r.addEventListener("change", () => {
      httpMode = r.value;
      httpRun++;
      httpT = Infinity;
      drawHttp();
      httpSummary();
      playHttp();
    }),
  );
  $("#httpGo").addEventListener("click", playHttp);
  onResize(httpHost, drawHttp);
  drawHttp();
  httpSummary();
};

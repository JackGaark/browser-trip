import { $, $$, S, tween, onResize } from "../core/utils.js";

export const initScripts = ({ sound }) => {
  const SC = {
    plain: {
      parse: [
        [0, 30],
        [85, 120],
      ],
      pause: [[30, 85]],
      dl: [[30, 70]],
      run: [[70, 85]],
      dcl: 120,
      snip: '<script src="app.js"><\/script>',
      text: "The parser stops at the tag, waits for the download, runs the script, and only then reads on. Every millisecond the network takes is a millisecond the page isn’t being built.",
    },
    async: {
      parse: [
        [0, 60],
        [75, 112],
      ],
      pause: [[60, 75]],
      dl: [[30, 60]],
      run: [[60, 75]],
      dcl: 112,
      snip: '<script src="app.js" async><\/script>',
      text: "async downloads alongside parsing and runs the moment it arrives, pausing the parser only while it runs. Good for independent scripts like analytics; several async scripts may run in any order.",
    },
    defer: {
      parse: [[0, 100]],
      pause: [],
      dl: [[30, 60]],
      run: [[100, 114]],
      dcl: 116,
      snip: '<script src="app.js" defer><\/script>',
      text: "defer downloads alongside parsing and waits until the document is fully parsed, then runs in order, just before DOMContentLoaded. Module scripts behave this way by default.",
    },
  };
  const scHost = $("#scSvg");
  let scMode = "plain",
    scRun = 0,
    scT = Infinity;
  function drawSc() {
    const W = Math.max(300, scHost.clientWidth),
      L = 8,
      R = 12,
      top = 26,
      rowH = 62,
      m = SC[scMode],
      T = scT;
    const x = (t) => L + (t / 130) * (W - L - R),
      H = top + 3 * rowH + 20;
    scHost.innerHTML = "";
    const svg = S(
      "svg",
      {
        viewBox: `0 0 ${W} ${H}`,
        width: W,
        height: H,
        class: "fig",
        role: "img",
        "aria-label": `Timeline for a ${scMode} script: DOMContentLoaded at ${m.dcl} milliseconds.`,
      },
      scHost,
    );
    for (let t = 0; t <= 120; t += 20)
      S(
        "text",
        {
          x: x(t),
          y: 12,
          "text-anchor": t === 0 ? "start" : "middle",
          class: "axis",
        },
        svg,
        t === 0 ? "0 ms" : String(t),
      );
    const rows = [
      ["Parsing HTML", m.parse, "seg-parse"],
      ["Downloading app.js", m.dl, "seg-dl"],
      ["Running app.js", m.run, "seg-run"],
    ];
    rows.forEach(([lbl, segs, cls], i) => {
      const y = top + i * rowH;
      S("text", { x: L, y: y + 14, class: "rowlbl" }, svg, lbl);
      S(
        "line",
        { x1: L, x2: W - R, y1: y + 36, y2: y + 36, class: "gridl" },
        svg,
      );
      if (i === 0)
        m.pause.forEach(([a, b]) => {
          if (T <= a) return;
          const e = Math.min(b, T);
          S(
            "rect",
            {
              x: x(a),
              y: y + 24,
              width: x(e) - x(a),
              height: 24,
              rx: 3,
              class: "seg-pause",
            },
            svg,
          );
          if (x(e) - x(a) > 60)
            S(
              "text",
              {
                x: (x(a) + x(e)) / 2,
                y: y + 40,
                "text-anchor": "middle",
                class: "pause-l",
              },
              svg,
              "paused",
            );
        });
      segs.forEach(([a, b]) => {
        if (T <= a) return;
        const e = Math.min(b, T);
        S(
          "rect",
          {
            x: x(a),
            y: y + 24,
            width: Math.max(1, x(e) - x(a)),
            height: 24,
            rx: 4,
            class: cls,
          },
          svg,
        );
      });
    });
    if (T >= m.dcl) {
      const lx = x(m.dcl),
        right = lx < W - 140;
      S("line", { x1: lx, x2: lx, y1: top, y2: H - 8, class: "dcl" }, svg);
      S(
        "text",
        {
          x: right ? lx + 6 : lx - 6,
          y: H - 10,
          "text-anchor": right ? "start" : "end",
          class: "dcl-l",
        },
        svg,
        "DOMContentLoaded",
      );
    }
    if (T < 130)
      S(
        "line",
        { x1: x(T), x2: x(T), y1: top - 4, y2: H - 8, class: "cursor" },
        svg,
      );
  }
  async function playSc() {
    const run = ++scRun,
      m = SC[scMode],
      cues = new Set();
    $("#scSnip").textContent = m.snip;
    $("#scText").textContent = m.text;
    scT = 0;
    await tween(
      1700,
      (e) => {
        scT = e * 130;
        m.pause.forEach(([a]) => {
          if (scT >= a && !cues.has("p" + a)) {
            cues.add("p" + a);
            sound.tone(150, { dur: 0.3, type: "triangle", gain: 0.08 });
          }
        });
        m.dl.forEach(([a]) => {
          if (scT >= a && !cues.has("d" + a)) {
            cues.add("d" + a);
            sound.cue.blip(660);
          }
        });
        m.run.forEach(([a]) => {
          if (scT >= a && !cues.has("r" + a)) {
            cues.add("r" + a);
            sound.cue.note("G", 0, 0.3);
          }
        });
        if (scT >= m.dcl && !cues.has("dcl")) {
          cues.add("dcl");
          sound.cue.good();
        }
        drawSc();
      },
      () => run === scRun,
    );
    if (run === scRun) {
      scT = Infinity;
      drawSc();
    }
  }
  $$('input[name="sc"]').forEach((r) =>
    r.addEventListener("change", () => {
      scMode = r.value;
      playSc();
    }),
  );
  onResize(scHost, drawSc);
  $("#scSnip").textContent = SC.plain.snip;
  $("#scText").textContent = SC.plain.text;
  drawSc();
};

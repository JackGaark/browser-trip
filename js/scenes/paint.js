import { canvasFont } from "../core/utils.js";
import { $, sleep } from "../core/utils.js";

export const initPaint = ({ sound }) => {
  const pcv = $("#pcv"),
    pctx = pcv.getContext("2d");
  (() => {
    const dpr = devicePixelRatio || 1;
    pcv.width = 320 * dpr;
    pcv.height = 220 * dpr;
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  })();
  const rr = (c, x, y, w, h, r, fill) => {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
  };
  const DL = [
    [
      "drawRect",
      "page background",
      (c) => {
        c.fillStyle = "#fffdf8";
        c.fillRect(0, 0, 320, 220);
      },
    ],
    [
      "drawRect",
      "header bar",
      (c) => {
        c.fillStyle = "#2f5fb3";
        c.fillRect(0, 0, 320, 38);
      },
    ],
    [
      "drawText",
      "“hello, web”",
      (c) => {
        c.fillStyle = "#fff";
        c.font = `bold 15px ${canvasFont}`;
        c.fillText("hello, web", 14, 25);
      },
    ],
    ["drawRRect", "card", (c) => rr(c, 14, 52, 176, 112, 8, "#f3ead5"), "card"],
    [
      "drawText",
      "card title",
      (c) => {
        c.fillStyle = "#2a2420";
        c.font = `bold 13px ${canvasFont}`;
        c.fillText("Paint is a list", 26, 76);
      },
      "card",
    ],
    [
      "drawRect",
      "4 text lines",
      (c) => {
        c.fillStyle = "#c9bfae";
        [92, 104, 116, 128].forEach((y, i) =>
          c.fillRect(26, y, i === 3 ? 90 : 150, 6),
        );
      },
      "card",
    ],
    [
      "drawImage",
      "hero.jpg",
      (c) => {
        const g = c.createLinearGradient(0, 52, 0, 164);
        g.addColorStop(0, "#9fd0ef");
        g.addColorStop(1, "#fbe7b5");
        c.fillStyle = g;
        c.fillRect(160, 52, 146, 112);
        c.fillStyle = "#f5d06f";
        c.beginPath();
        c.arc(276, 80, 12, 0, 7);
        c.fill();
        c.fillStyle = "#5f9e7a";
        c.beginPath();
        c.moveTo(160, 164);
        c.lineTo(214, 108);
        c.lineTo(250, 140);
        c.lineTo(276, 120);
        c.lineTo(306, 164);
        c.fill();
      },
    ],
    ["drawRRect", "button", (c) => rr(c, 14, 176, 104, 30, 15, "#d9573f")],
    [
      "drawText",
      "“Read more”",
      (c) => {
        c.fillStyle = "#fff";
        c.font = `bold 12px ${canvasFont}`;
        c.fillText("Read more", 36, 195);
      },
    ],
  ];
  let pOrder = DL.map((_, i) => i),
    pN = DL.length,
    pRun = 0;
  const dlist = $("#dlist");
  function paintTo(n) {
    pN = n;
    pctx.clearRect(0, 0, 320, 220);
    if (n === 0) {
      pctx.fillStyle = "#132a5a";
      pctx.fillRect(0, 0, 320, 220);
      pctx.fillStyle = "#a3b3d8";
      pctx.font = `13px ${canvasFont}`;
      pctx.fillText("No draw calls yet", 104, 114);
    }
    for (let i = 0; i < n; i++) DL[pOrder[i]][2](pctx);
    dlist.innerHTML = pOrder
      .map(
        (k, i) =>
          `<li class="${i < n - 1 ? "done" : i === n - 1 ? "now" : ""}"><b>${DL[k][0]}</b><span>${DL[k][1]}</span></li>`,
      )
      .join("");
    $("#pSum").textContent =
      n === DL.length
        ? `All ${n} commands drawn.${$("#pSwap").checked ? " The card now covers part of the image, because it was drawn after it." : " The image overlaps the card’s edge: it was drawn later, so it lands on top."}`
        : `Command ${n} of ${DL.length}: ${n ? DL[pOrder[n - 1]][0] + " " + DL[pOrder[n - 1]][1] : "nothing drawn yet"}.`;
  }
  async function playPaint() {
    const run = ++pRun;
    for (let i = 0; i <= DL.length; i++) {
      if (run !== pRun) return;
      paintTo(i);
      if (i) sound.cue.tick(440 + i * 70, 0, 0.05);
      await sleep(420);
    }
    if (run === pRun) sound.cue.good();
  }
  $("#pPlay").addEventListener("click", playPaint);
  $("#pStep").addEventListener("click", () => {
    pRun++;
    const n = pN >= DL.length ? 0 : pN + 1;
    paintTo(n);
    sound.cue.tick(440 + n * 70, 0, 0.05);
  });
  $("#pSwap").addEventListener("change", (e) => {
    const base = DL.map((_, i) => i);
    pOrder = e.target.checked
      ? [
          ...base.filter((i) => DL[i][3] !== "card"),
          ...base.filter((i) => DL[i][3] === "card"),
        ]
      : base;
    pRun++;
    paintTo(DL.length);
    sound.cue.blip(520);
  });
  paintTo(DL.length);
};

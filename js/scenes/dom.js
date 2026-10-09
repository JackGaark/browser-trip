import { $, $$, esc, S, sleep, onResize } from "../core/utils.js";

export const initDom = ({ sound }) => {
  const DOM_DEFAULT = `<!doctype html>
<html>
  <head>
    <title>hi</title>
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
    <h1>hello, web</h1>
    <p>A <em>tiny</em> page.</p>
    <img src="hero.png" alt="">
  </body>
</html>`;
  const DOM_SLOPPY = `<title>sloppy</title>
<h1>No html, head or body tags
<p>An unclosed paragraph
<p>Mis-nested <b>bold <i>and</b> italic</i>`;
  const domSrc = $("#domSrc"),
    tapeEl = $("#tape"),
    treeHost = $("#domTree");
  domSrc.value = DOM_DEFAULT;
  let domRun = 0,
    domNodes = [],
    domEls = [];
  const tokens = (src) =>
    (src.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) || [])
      .map((t) => t.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  function buildTree(src) {
    const doc = new DOMParser().parseFromString(src, "text/html"),
      lower = src.toLowerCase(),
      out = [];
    const walk = (node, depth, parent) => {
      if (out.length >= 48) return;
      let label, kind;
      if (node.nodeType === 1) {
        label = `<${node.tagName.toLowerCase()}>`;
        kind = "el";
      } else if (node.nodeType === 3) {
        const t = node.textContent.trim();
        if (!t) return;
        label = `“${t.length > 12 ? t.slice(0, 11) + "…" : t}”`;
        kind = "text";
      } else if (node.nodeType === 8) {
        label = "<!-- -->";
        kind = "el";
      } else return;
      const tag = node.nodeType === 1 ? node.tagName.toLowerCase() : "";
      const added =
        !!tag && !new RegExp("<" + tag + "[\\s>/]", "i").test(lower);
      const me = { label, kind, depth, parent, added, kids: [] };
      out.push(me);
      if (parent) parent.kids.push(me);
      if (node.nodeType === 1)
        [...node.childNodes].forEach((c) => walk(c, depth + 1, me));
    };
    walk(doc.documentElement, 0, null);
    return out;
  }
  function drawDom(hidden) {
    domRun++;
    const src = domSrc.value,
      nodes = buildTree(src);
    domNodes = nodes;
    let leaf = 0,
      maxD = 0;
    const place = (n) => {
      maxD = Math.max(maxD, n.depth);
      if (!n.kids.length) n.x = leaf++;
      else {
        n.kids.forEach(place);
        n.x = (n.kids[0].x + n.kids[n.kids.length - 1].x) / 2;
      }
    };
    if (nodes[0]) place(nodes[0]);
    const colW = 84,
      rowH = 56,
      padX = 46;
    const W = Math.max(
        treeHost.clientWidth || 300,
        leaf * colW + padX * 2 - colW + 20,
      ),
      H = (maxD + 1) * rowH + 20;
    const off = (W - (leaf - 1) * colW) / 2;
    const X = (n) => off + n.x * colW,
      Y = (n) => 24 + n.depth * rowH;
    treeHost.innerHTML = "";
    const svg = S(
      "svg",
      {
        viewBox: `0 0 ${W} ${H}`,
        width: W,
        height: H,
        class: "fig",
        role: "img",
        "aria-label": `DOM tree with ${nodes.length} nodes: ${nodes
          .slice(0, 12)
          .map((n) => n.label)
          .join(", ")}${nodes.length > 12 ? "…" : ""}`,
      },
      treeHost,
    );
    svg.style.maxWidth = "none";
    domEls = [];
    nodes.forEach((n) => {
      let link = null;
      if (n.parent)
        link = S(
          "path",
          {
            d: `M${X(n.parent)} ${Y(n.parent) + 11} C${X(n.parent)} ${Y(n) - 20} ${X(n)} ${Y(n.parent) + 30} ${X(n)} ${Y(n) - 11}`,
            class: "dlink" + (hidden ? " hid" : ""),
          },
          svg,
        );
      const g = S(
        "g",
        {
          class:
            `dn ${n.kind === "text" ? "text" : ""} ${n.added ? "added" : ""}` +
            (hidden ? " hid" : ""),
        },
        svg,
      );
      const w = Math.max(40, n.label.length * 7.4 + 14);
      S(
        "rect",
        { x: X(n) - w / 2, y: Y(n) - 11, width: w, height: 22, rx: 11 },
        g,
      );
      S("text", { x: X(n), y: Y(n) + 4, "text-anchor": "middle" }, g, n.label);
      domEls.push({ g, link, n });
    });
    const toks = tokens(src);
    tapeEl.innerHTML = toks
      .map(
        (t) => `<span>${esc(t.length > 40 ? t.slice(0, 39) + "…" : t)}</span>`,
      )
      .join("");
    tapeEl.style.transform = "translateX(0)";
    const added = nodes.filter((n) => n.added).length;
    $("#domSum").textContent =
      `${toks.length} tokens became ${nodes.length} DOM nodes${added ? `; ${added} element${added === 1 ? " was" : "s were"} added by the parser` : ""}.`;
    return { toks };
  }
  async function playDom() {
    const { toks } = drawDom(true),
      run = domRun,
      spans = $$("span", tapeEl);
    for (let i = 0; i < domEls.length; i++) {
      if (run !== domRun) return;
      const { g, link, n } = domEls[i];
      const k = Math.min(
        spans.length - 1,
        Math.round((i / Math.max(1, domEls.length - 1)) * (spans.length - 1)),
      );
      spans.forEach((s, j) => {
        s.classList.toggle("cur", j === k);
        s.classList.toggle("past", j < k);
      });
      if (spans[k])
        tapeEl.style.transform = `translateX(${-Math.max(0, spans[k].offsetLeft - 60)}px)`;
      g.classList.remove("hid");
      if (link) link.classList.remove("hid");
      sound.cue.tick(
        n.added ? 1300 : 420 + n.depth * 90,
        0,
        n.added ? 0.05 : 0.035,
      );
      await sleep(150);
    }
    spans.forEach((s) => {
      s.classList.remove("cur");
      s.classList.add("past");
    });
    if (toks.length) sound.cue.good();
  }
  $("#domGo").addEventListener("click", playDom);
  $("#domSloppy").addEventListener("click", () => {
    domSrc.value = DOM_SLOPPY;
    playDom();
  });
  $("#domReset").addEventListener("click", () => {
    domSrc.value = DOM_DEFAULT;
    drawDom(false);
  });
  let domDeb = 0;
  domSrc.addEventListener("input", () => {
    clearTimeout(domDeb);
    domDeb = setTimeout(() => drawDom(false), 250);
  });
  onResize(treeHost, () => drawDom(false));
  drawDom(false);
};

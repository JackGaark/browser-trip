import { $, esc, S, tween, onResize, edgePt } from "../core/utils.js";

export const initDns = ({ sound, state }) => {
  const dnsHostEl = $("#dnsSvg");
  let dnsL = null,
    dnsRun = 0,
    dnsEls = {};
  function dnsNodesDef() {
    const tld = state.hostname.includes(".")
      ? state.hostname.split(".").pop()
      : "local";
    return {
      you: ["Your browser", "needs an address"],
      bc: ["Browser cache", "recent answers"],
      os: ["Operating system", "its own cache"],
      rr: ["Recursive resolver", "does the legwork"],
      root: ["Root server", "knows every TLD"],
      tld: [`.${tld} server`, `knows ${tld} domains`],
      auth: ["Authoritative", state.hostname],
    };
  }
  function dnsLayout() {
    const W = Math.max(300, dnsHostEl.clientWidth),
      wide = W >= 560,
      H = wide ? 380 : 560,
      pad = 6,
      h = 52,
      w = wide ? 132 : Math.min(156, (W - 24) / 2);
    const F = wide
      ? {
          you: [0, 0.5],
          bc: [0.34, 0.1],
          os: [0.34, 0.9],
          rr: [0.62, 0.5],
          root: [1, 0.08],
          tld: [1, 0.5],
          auth: [1, 0.92],
        }
      : {
          you: [0.5, 0],
          bc: [0, 0.22],
          os: [1, 0.22],
          rr: [0.5, 0.45],
          root: [0, 0.72],
          tld: [1, 0.72],
          auth: [0.5, 1],
        };
    const P = {};
    for (const k in F) {
      const [fx, fy] = F[k];
      P[k] = {
        x: pad + w / 2 + fx * (W - 2 * pad - w),
        y: pad + h / 2 + fy * (H - 2 * pad - h),
        w,
        h,
      };
    }
    return { W, H, P };
  }
  function drawDns() {
    dnsRun++;
    dnsL = dnsLayout();
    const { W, H, P } = dnsL,
      D = dnsNodesDef();
    dnsHostEl.innerHTML = "";
    const svg = S(
      "svg",
      {
        viewBox: `0 0 ${W} ${H}`,
        width: W,
        height: H,
        class: "fig",
        role: "img",
        "aria-label":
          "DNS lookup map: your browser, browser cache, operating system, recursive resolver, root server, top-level domain server and authoritative server.",
      },
      dnsHostEl,
    );
    [
      ["you", "bc"],
      ["you", "os"],
      ["you", "rr"],
      ["rr", "root"],
      ["rr", "tld"],
      ["rr", "auth"],
    ].forEach(([a, b]) => {
      const p = edgePt(P[a], P[b]),
        q = edgePt(P[b], P[a]);
      S("line", { x1: p.x, y1: p.y, x2: q.x, y2: q.y, class: "wire" }, svg);
    });
    dnsEls = {};
    for (const k in P) {
      const n = P[k],
        g = S("g", { class: "bnode" }, svg);
      S(
        "rect",
        { x: n.x - n.w / 2, y: n.y - n.h / 2, width: n.w, height: n.h, rx: 6 },
        g,
      );
      S(
        "text",
        { x: n.x, y: n.y - 3, "text-anchor": "middle", class: "t" },
        g,
        D[k][0],
      );
      S(
        "text",
        { x: n.x, y: n.y + 14, "text-anchor": "middle", class: "s" },
        g,
        D[k][1].length > 22 ? D[k][1].slice(0, 21) + "…" : D[k][1],
      );
      dnsEls[k] = g;
    }
    const pkt = S("g", { class: "pkt", style: "display:none" }, svg);
    S("circle", { r: 6 }, pkt);
    S("text", {}, pkt);
    dnsEls.pkt = pkt;
  }
  function setDnsHost() {
    $("#dnsHost").textContent = state.hostname;
    drawDns();
    $("#dnsLog").innerHTML = "";
    $("#dnsSum").textContent = `Ready to look up ${state.hostname}.`;
  }
  function dnsSeq(warm) {
    const tld = state.hostname.includes(".")
      ? state.hostname.split(".").pop()
      : "local";
    const IP = "203.0.113.42";
    if (warm)
      return [
        ["you", "bc", `${state.hostname}?`, 0.1, "Browser cache: found it"],
        ["bc", "you", IP, 0.1, "Answer: " + IP, "hit"],
      ];
    return [
      [
        "you",
        "bc",
        `${state.hostname}?`,
        0.1,
        "Browser cache: not here",
        "miss",
      ],
      [
        "you",
        "os",
        `${state.hostname}?`,
        1,
        "Operating system: not here",
        "miss",
      ],
      ["you", "rr", `${state.hostname}?`, 8, "Asked the resolver"],
      [
        "rr",
        "root",
        `who runs .${tld}?`,
        10,
        `Root: “ask the .${tld} servers”`,
      ],
      ["root", "rr", `ask .${tld}`, 10, ""],
      [
        "rr",
        "tld",
        `who runs ${state.hostname}?`,
        12,
        `.${tld}: “ask ${state.hostname}’s name servers”`,
      ],
      ["tld", "rr", `ask ns1.${state.hostname}`, 12, ""],
      [
        "rr",
        "auth",
        `address of ${state.hostname}?`,
        15,
        "Authoritative: the real answer",
      ],
      ["auth", "rr", IP, 15, "", "hit"],
      ["rr", "you", IP, 8, "Answer: " + IP + " (now cached)", "hit"],
    ];
  }
  async function resolveDns() {
    const run = ++dnsRun,
      warm = $("#dnsWarm").checked,
      seq = dnsSeq(warm),
      log = $("#dnsLog");
    log.innerHTML = "";
    let total = 0;
    Object.values(dnsEls).forEach(
      (g) => g.classList && g.classList.remove("ask", "miss", "hit"),
    );
    const pkt = dnsEls.pkt,
      txt = $("text", pkt),
      circ = $("circle", pkt);
    pkt.style.display = "";
    for (let i = 0; i < seq.length; i++) {
      const [a, b, label, ms, note, state] = seq[i];
      const isAns = /^\d/.test(label) || state === "hit";
      pkt.setAttribute("class", "pkt" + (isAns ? " ans" : ""));
      txt.textContent = label;
      dnsEls[b].classList.add("ask");
      sound.cue.blip(isAns ? 520 + i * 30 : 760 + i * 40);
      const p = edgePt(dnsL.P[a], dnsL.P[b]),
        q = edgePt(dnsL.P[b], dnsL.P[a]);
      const vert = Math.abs(q.y - p.y) > Math.abs(q.x - p.x),
        half = label.length * 3.4,
        W = dnsL.W;
      const ok = await tween(
        620,
        (e) => {
          const x = p.x + (q.x - p.x) * e,
            y = p.y + (q.y - p.y) * e;
          pkt.setAttribute("transform", `translate(${x},${y})`);
          if (vert) {
            const right = x + 12 + half * 2 < W;
            txt.setAttribute("x", right ? 11 : -11);
            txt.setAttribute("y", 4);
            txt.setAttribute("text-anchor", right ? "start" : "end");
          } else {
            let dx = 0;
            if (x + half > W - 4) dx = W - 4 - half - x;
            if (x - half < 4) dx = 4 + half - x;
            txt.setAttribute("x", dx);
            txt.setAttribute("y", -12);
            txt.setAttribute("text-anchor", "middle");
          }
        },
        () => run === dnsRun,
      );
      if (!ok) return;
      dnsEls[b].classList.remove("ask");
      if (state) dnsEls[b].classList.add(state);
      if (state === "miss") sound.cue.tick(300, 0, 0.05);
      total += ms;
      if (note) {
        const li = document.createElement("li");
        if (state === "hit") li.className = "ok";
        li.innerHTML = `<span>+${ms} ms</span><span>${esc(note)}</span>`;
        log.appendChild(li);
      }
    }
    pkt.style.display = "none";
    sound.cue.good(0.05);
    $("#dnsSum").textContent = warm
      ? `Found in the browser’s cache in about ${total} ms. No network traffic at all.`
      : `Resolved ${state.hostname} in about ${total} ms of illustrative network time. The answer is now cached, so the next lookup is nearly free.`;
    if (!warm) $("#dnsWarm").checked = true;
  }
  $("#dnsGo").addEventListener("click", resolveDns);
  onResize(dnsHostEl, drawDns);
  drawDns();

  return setDnsHost;
};

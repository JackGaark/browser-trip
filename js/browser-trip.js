
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NS = "http://www.w3.org/2000/svg";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function S(tag, attrs = {}, parent, text) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  const ease = (k) => (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  function tween(dur, fn, live = () => true) {
    return new Promise((res) => {
      if (reduce.matches) { fn(1, 1); setTimeout(() => res(live()), Math.min(dur, 160)); return; }
      const t0 = performance.now();
      const step = (now) => {
        if (!live()) return res(false);
        const k = Math.min(1, (now - t0) / dur);
        fn(ease(k), k);
        if (k < 1) requestAnimationFrame(step); else res(true);
      };
      requestAnimationFrame(step);
    });
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, reduce.matches ? Math.min(ms, 100) : ms));
  function onResize(el, fn) {
    let w = 0, raf = 0;
    new ResizeObserver(() => { const nw = el.clientWidth; if (!nw || nw === w) return; w = nw; cancelAnimationFrame(raf); raf = requestAnimationFrame(fn); }).observe(el);
  }
  function edgePt(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.min(dx ? (a.w / 2) / Math.abs(dx) : Infinity, dy ? (a.h / 2) / Math.abs(dy) : Infinity);
    return { x: a.x + dx * t, y: a.y + dy * t };
  }
  const restart = (el, cls) => { el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls); };

  /* ================= Procedural sound ================= */
  const Sound = (() => {
    let ctx = null, master = null, on = false;
    const NOTE = { C: 523.25, D: 587.33, E: 659.25, F: 698.46, G: 783.99, A: 880, B: 987.77 };
    function ensure() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        try { ctx = new AC(); } catch (e) { return false; }
        const comp = ctx.createDynamicsCompressor();
        master = ctx.createGain(); master.gain.value = 0.55;
        master.connect(comp); comp.connect(ctx.destination);
      }
      if (ctx.state === "suspended") ctx.resume();
      return true;
    }
    function tone(freq, o = {}) {
      if (!on || !ctx) return;
      const { dur = 0.18, type = "sine", gain = 0.1, at = 0, slide = 0, attack = 0.006 } = o;
      const t = ctx.currentTime + at + 0.01;
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = type; osc.frequency.setValueAtTime(freq, t);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + dur + 0.05);
    }
    function noise(dur = 0.3, freq = 400, gain = 0.25, at = 0) {
      if (!on || !ctx) return;
      const t = ctx.currentTime + at + 0.01;
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = buf; f.type = "lowpass"; f.frequency.value = freq; g.gain.value = gain;
      src.connect(f); f.connect(g); g.connect(master); src.start(t);
    }
    const cue = {
      tick: (f = 1200, at = 0, gain = 0.03) => tone(f, { dur: 0.04, gain, at, type: "triangle" }),
      blip: (f = 660, at = 0) => tone(f, { dur: 0.12, gain: 0.07, at, type: "triangle" }),
      note: (l, at = 0, len = 0.5) => { const f = NOTE[l] || 440; tone(f, { dur: len, gain: 0.11, at }); tone(f * 2, { dur: len * 0.6, gain: 0.025, at }); },
      good: (at = 0) => { cue.note("C", at, .3); cue.note("E", at + .09, .3); cue.note("G", at + .18, .5); },
      bad: (at = 0) => { tone(185, { dur: 0.35, type: "sawtooth", gain: 0.035, at }); tone(196, { dur: 0.35, type: "sawtooth", gain: 0.035, at }); },
      boing: (at = 0) => tone(260, { dur: 0.3, gain: 0.09, slide: 2.2, at, type: "triangle" }),
      pop: (at = 0) => { noise(0.08, 1800, 0.15, at); tone(880, { dur: 0.08, gain: 0.04, at, slide: 0.5 }); },
      thud: (at = 0) => { noise(0.35, 180, 0.5, at); tone(60, { dur: 0.4, gain: 0.25, at, slide: 0.6 }); }
    };
    return { get on() { return on; }, toggle() { if (!ensure()) return null; on = !on; if (on) cue.good(); return on; }, tone, cue };
  })();
  const sBtn = $("#soundBtn");
  sBtn.addEventListener("click", () => {
    const r = Sound.toggle();
    if (r === null) { $(".stxt", sBtn).textContent = "Sound unavailable"; sBtn.disabled = true; return; }
    sBtn.setAttribute("aria-pressed", String(r));
    $(".stxt", sBtn).textContent = r ? "Sound on" : "Sound off";
  });

  /* ================= Stage ring ================= */
  const scenes = $$("[data-ring]"), ring = $("#ring"), ringArc = $("#ringArc"), ringLbl = $("#ringLbl"), C = 81.7;
  const ringIO = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting) return;
      const i = scenes.indexOf(e.target);
      ringLbl.textContent = e.target.dataset.ring;
      ringArc.style.strokeDashoffset = String(C * (1 - i / (scenes.length - 1)));
      ring.classList.toggle("dark", e.target.classList.contains("blue"));
    });
  }, { rootMargin: "-48% 0px -50% 0px" });
  scenes.forEach((s) => ringIO.observe(s));

  /* ================= 1. URL ================= */
  let HOST = "example.com";
  const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
  function classify(raw) {
    const t = raw.trim();
    if (!t) return { kind: "empty" };
    const local = /^localhost(:\d+)?(\/|$)/i.test(t);
    const looksHost = HAS_SCHEME.test(t) || local || /^[^\s/]+\.[a-z0-9-]{2,}(:\d+)?([/?#]|$)/i.test(t);
    if (/\s/.test(t) || !looksHost) return { kind: "search", q: t };
    try {
      const u = new URL(HAS_SCHEME.test(t) ? t : (local ? "http://" : "https://") + t);
      return { kind: "url", u, added: !HAS_SCHEME.test(t) };
    } catch (e) { return { kind: "search", q: t }; }
  }
  const urlIn = $("#urlIn"), urlParts = $("#urlParts"), urlVerdict = $("#urlVerdict");
  function renderUrl(animate) {
    const r = classify(urlIn.value);
    const cls = animate ? "part new" : "part";
    if (r.kind === "empty") { urlParts.innerHTML = ""; urlVerdict.textContent = "Type something in the address bar."; return r; }
    if (r.kind === "search") {
      urlParts.innerHTML = `<div class="${cls} wide"><dt>search query</dt><dd>${esc(r.q)}</dd><small>sent to your search engine</small></div>`;
      urlVerdict.textContent = `That doesn’t look like an address, so the browser would search for “${r.q}” instead.`;
      return r;
    }
    const u = r.u, def = u.protocol === "https:" ? "443" : u.protocol === "http:" ? "80" : "";
    const P = [["scheme", u.protocol.replace(":", ""), r.added ? "filled in for you" : ""], ["host", u.hostname, ""], ["port", u.port || def, u.port ? "" : "default"], ["path", u.pathname, ""], ["query", u.search || "none", ""], ["fragment", u.hash || "none", u.hash ? "never sent to the server" : ""]];
    urlParts.innerHTML = P.map(([k, v, n], i) => `<div class="${cls}" style="animation-delay:${i * 60}ms"><dt>${k}</dt><dd>${esc(v)}</dd>${n ? `<small>${esc(n)}</small>` : ""}</div>`).join("");
    urlVerdict.textContent = `That’s an address. The browser will connect to ${u.hostname} on port ${u.port || def} over ${u.protocol.replace(":", "").toUpperCase()}.${r.added ? ` You didn’t type a scheme, so it assumed ${u.protocol}//.` : ""}`;
    return r;
  }
  urlIn.addEventListener("input", () => renderUrl(false));
  $("#urlForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const r = renderUrl(true), pip = $("#pipUrl");
    if (r.kind === "url") {
      HOST = r.u.hostname; $("#urlTab").textContent = HOST; setDnsHost();
      restart(pip, "hop"); Sound.cue.boing();
      r.added ? Sound.cue.note("E", .25) : Sound.cue.note("C", .25);
    } else if (r.kind === "search") {
      $("#urlTab").textContent = "Search results"; restart(pip, "shake"); Sound.cue.blip(440);
    }
  });
  $$("[data-try]").forEach((b) => b.addEventListener("click", () => { urlIn.value = b.dataset.try; renderUrl(true); urlIn.focus(); Sound.cue.tick(900); }));
  renderUrl(false);

  /* ================= 2. DNS ================= */
  const dnsHostEl = $("#dnsSvg");
  let dnsL = null, dnsRun = 0, dnsEls = {};
  function dnsNodesDef() {
    const tld = HOST.includes(".") ? HOST.split(".").pop() : "local";
    return { you: ["Your browser", "needs an address"], bc: ["Browser cache", "recent answers"], os: ["Operating system", "its own cache"], rr: ["Recursive resolver", "does the legwork"], root: ["Root server", "knows every TLD"], tld: [`.${tld} server`, `knows ${tld} domains`], auth: ["Authoritative", HOST] };
  }
  function dnsLayout() {
    const W = Math.max(300, dnsHostEl.clientWidth), wide = W >= 560, H = wide ? 380 : 560, pad = 6, h = 52, w = wide ? 132 : Math.min(156, (W - 24) / 2);
    const F = wide ? { you: [0, .5], bc: [.34, .1], os: [.34, .9], rr: [.62, .5], root: [1, .08], tld: [1, .5], auth: [1, .92] }
      : { you: [.5, 0], bc: [0, .22], os: [1, .22], rr: [.5, .45], root: [0, .72], tld: [1, .72], auth: [.5, 1] };
    const P = {};
    for (const k in F) { const [fx, fy] = F[k]; P[k] = { x: pad + w / 2 + fx * (W - 2 * pad - w), y: pad + h / 2 + fy * (H - 2 * pad - h), w, h }; }
    return { W, H, P };
  }
  function drawDns() {
    dnsRun++;
    dnsL = dnsLayout();
    const { W, H, P } = dnsL, D = dnsNodesDef();
    dnsHostEl.innerHTML = "";
    const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "fig", role: "img", "aria-label": "DNS lookup map: your browser, browser cache, operating system, recursive resolver, root server, top-level domain server and authoritative server." }, dnsHostEl);
    [["you", "bc"], ["you", "os"], ["you", "rr"], ["rr", "root"], ["rr", "tld"], ["rr", "auth"]].forEach(([a, b]) => {
      const p = edgePt(P[a], P[b]), q = edgePt(P[b], P[a]);
      S("line", { x1: p.x, y1: p.y, x2: q.x, y2: q.y, class: "wire" }, svg);
    });
    dnsEls = {};
    for (const k in P) {
      const n = P[k], g = S("g", { class: "bnode" }, svg);
      S("rect", { x: n.x - n.w / 2, y: n.y - n.h / 2, width: n.w, height: n.h, rx: 6 }, g);
      S("text", { x: n.x, y: n.y - 3, "text-anchor": "middle", class: "t" }, g, D[k][0]);
      S("text", { x: n.x, y: n.y + 14, "text-anchor": "middle", class: "s" }, g, D[k][1].length > 22 ? D[k][1].slice(0, 21) + "…" : D[k][1]);
      dnsEls[k] = g;
    }
    const pkt = S("g", { class: "pkt", style: "display:none" }, svg);
    S("circle", { r: 6 }, pkt);
    S("text", {}, pkt);
    dnsEls.pkt = pkt;
  }
  function setDnsHost() { $("#dnsHost").textContent = HOST; drawDns(); $("#dnsLog").innerHTML = ""; $("#dnsSum").textContent = `Ready to look up ${HOST}.`; }
  function dnsSeq(warm) {
    const tld = HOST.includes(".") ? HOST.split(".").pop() : "local";
    const IP = "203.0.113.42";
    if (warm) return [["you", "bc", `${HOST}?`, 0.1, "Browser cache: found it"], ["bc", "you", IP, 0.1, "Answer: " + IP, "hit"]];
    return [
      ["you", "bc", `${HOST}?`, 0.1, "Browser cache: not here", "miss"],
      ["you", "os", `${HOST}?`, 1, "Operating system: not here", "miss"],
      ["you", "rr", `${HOST}?`, 8, "Asked the resolver"],
      ["rr", "root", `who runs .${tld}?`, 10, `Root: “ask the .${tld} servers”`],
      ["root", "rr", `ask .${tld}`, 10, ""],
      ["rr", "tld", `who runs ${HOST}?`, 12, `.${tld}: “ask ${HOST}’s name servers”`],
      ["tld", "rr", `ask ns1.${HOST}`, 12, ""],
      ["rr", "auth", `address of ${HOST}?`, 15, "Authoritative: the real answer"],
      ["auth", "rr", IP, 15, "", "hit"],
      ["rr", "you", IP, 8, "Answer: " + IP + " (now cached)", "hit"]
    ];
  }
  async function resolveDns() {
    const run = ++dnsRun, warm = $("#dnsWarm").checked, seq = dnsSeq(warm), log = $("#dnsLog");
    log.innerHTML = ""; let total = 0;
    Object.values(dnsEls).forEach((g) => g.classList && g.classList.remove("ask", "miss", "hit"));
    const pkt = dnsEls.pkt, txt = $("text", pkt), circ = $("circle", pkt);
    pkt.style.display = "";
    for (let i = 0; i < seq.length; i++) {
      const [a, b, label, ms, note, state] = seq[i];
      const isAns = /^\d/.test(label) || state === "hit";
      pkt.setAttribute("class", "pkt" + (isAns ? " ans" : ""));
      txt.textContent = label;
      dnsEls[b].classList.add("ask");
      Sound.cue.blip(isAns ? 520 + i * 30 : 760 + i * 40);
      const p = edgePt(dnsL.P[a], dnsL.P[b]), q = edgePt(dnsL.P[b], dnsL.P[a]);
      const vert = Math.abs(q.y - p.y) > Math.abs(q.x - p.x), half = label.length * 3.4, W = dnsL.W;
      const ok = await tween(620, (e) => {
        const x = p.x + (q.x - p.x) * e, y = p.y + (q.y - p.y) * e;
        pkt.setAttribute("transform", `translate(${x},${y})`);
        if (vert) { const right = x + 12 + half * 2 < W; txt.setAttribute("x", right ? 11 : -11); txt.setAttribute("y", 4); txt.setAttribute("text-anchor", right ? "start" : "end"); }
        else { let dx = 0; if (x + half > W - 4) dx = W - 4 - half - x; if (x - half < 4) dx = 4 + half - x; txt.setAttribute("x", dx); txt.setAttribute("y", -12); txt.setAttribute("text-anchor", "middle"); }
      }, () => run === dnsRun);
      if (!ok) return;
      dnsEls[b].classList.remove("ask");
      if (state) dnsEls[a === "you" ? b : b].classList.add(state);
      if (state === "miss") Sound.cue.tick(300, 0, .05);
      total += ms;
      if (note) { const li = document.createElement("li"); if (state === "hit") li.className = "ok"; li.innerHTML = `<span>+${ms} ms</span><span>${esc(note)}</span>`; log.appendChild(li); }
    }
    pkt.style.display = "none";
    Sound.cue.good(.05);
    $("#dnsSum").textContent = warm
      ? `Found in the browser’s cache in about ${total} ms. No network traffic at all.`
      : `Resolved ${HOST} in about ${total} ms of illustrative network time. The answer is now cached, so the next lookup is nearly free.`;
    if (!warm) $("#dnsWarm").checked = true;
  }
  $("#dnsGo").addEventListener("click", resolveDns);
  onResize(dnsHostEl, drawDns);
  drawDns();

  /* ================= 3. Handshake ================= */
  const HS = {
    "1.3": [["→", "SYN", "tcp"], ["←", "SYN-ACK", "tcp"], ["→", "ACK + ClientHello", "tls"], ["←", "ServerHello + cert + Finished", "tls"], ["→", "Finished + GET /", "http"], ["←", "200 OK + first bytes", "http"]],
    "1.2": [["→", "SYN", "tcp"], ["←", "SYN-ACK", "tcp"], ["→", "ACK + ClientHello", "tls"], ["←", "ServerHello + certificate", "tls"], ["→", "Key exchange + Finished", "tls"], ["←", "Finished", "tls"], ["→", "GET /", "http"], ["←", "200 OK + first bytes", "http"]]
  };
  const hsHost = $("#hsSvg");
  let hsVer = "1.3", hsRun = 0, hsGeo = null;
  function hsSummary() {
    const rtt = +$("#rtt").value, n = HS[hsVer].length / 2;
    $("#rttOut").textContent = rtt + " ms";
    $("#hsMs").textContent = n * rtt + " ms";
    $("#hsSum").textContent = `${n} round trips × ${rtt} ms before the first byte of the page arrives${hsVer === "1.2" ? ", one more than TLS 1.3" : ""}.`;
  }
  function drawHs() {
    hsRun++;
    const W = Math.max(300, hsHost.clientWidth), L = 58, R = W - 58, top = 104, rowH = 46, msgs = HS[hsVer];
    const H = top + msgs.length * rowH + 16;
    hsHost.innerHTML = "";
    const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "fig", role: "img", "aria-label": `Sequence diagram of a TLS ${hsVer} connection: ${msgs.map((m) => m[1]).join(", ")}.` }, hsHost);
    const defs = S("defs", {}, svg);
    ["tcp", "tls", "http"].forEach((k) => { const m = S("marker", { id: "hm-" + k, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs); S("path", { d: "M0,0 L10,5 L0,10 z", class: "mk-" + k }, m); });
    S("use", { href: "#pip", x: L - 28, y: 8, width: 56, height: 60 }, svg);
    S("use", { href: "#server", x: R - 22, y: 6, width: 44, height: 63 }, svg);
    S("text", { x: L, y: 88, "text-anchor": "middle", class: "hand-l" }, svg, "browser");
    S("text", { x: R, y: 88, "text-anchor": "middle", class: "hand-l" }, svg, "server");
    S("line", { x1: L, x2: L, y1: top - 8, y2: H - 6, class: "life" }, svg);
    S("line", { x1: R, x2: R, y1: top - 8, y2: H - 6, class: "life" }, svg);
    const geo = [];
    msgs.forEach((m, i) => {
      const y0 = top + i * rowH, y1 = y0 + rowH * .74, [x0, x1] = m[0] === "→" ? [L, R] : [R, L];
      const g = S("g", { class: "msg " + m[2] }, svg);
      S("line", { x1: x0, y1: y0, x2: x1, y2: y1, "marker-end": `url(#hm-${m[2]})` }, g);
      S("text", { x: (L + R) / 2, y: (y0 + y1) / 2 - 7, "text-anchor": "middle" }, g, m[1]);
      geo.push({ g, x0, y0, x1, y1, kind: m[2] });
      if (i % 2 === 1) S("text", { x: 2, y: y1 + 4, class: "rtt" }, svg, `RTT ${(i + 1) / 2}`);
    });
    const env = S("use", { href: "#pip", width: 30, height: 32, style: "display:none" }, svg);
    hsGeo = { geo, env };
  }
  async function playHs() {
    drawHs();
    const run = hsRun, { geo, env } = hsGeo;
    geo.forEach((m) => (m.g.style.opacity = .12));
    env.style.display = "";
    for (const m of geo) {
      Sound.cue.blip(m.kind === "tcp" ? 520 : m.kind === "tls" ? 700 : 880);
      const ok = await tween(560, (e) => { env.setAttribute("x", m.x0 + (m.x1 - m.x0) * e - 15); env.setAttribute("y", m.y0 + (m.y1 - m.y0) * e - 30); m.g.style.opacity = .12 + .88 * e; }, () => run === hsRun);
      if (!ok) return;
      m.g.style.opacity = 1;
    }
    env.style.display = "none";
    Sound.cue.good();
  }
  $$('input[name="tls"]').forEach((r) => r.addEventListener("change", () => { hsVer = r.value; drawHs(); hsSummary(); }));
  $("#rtt").addEventListener("input", hsSummary);
  $("#hsGo").addEventListener("click", playHs);
  onResize(hsHost, drawHs);
  drawHs(); hsSummary();

  /* ================= 4. HTTP/1.1 vs HTTP/2 ================= */
  const RES = [{ n: "index.html", kb: 14, t: "html" }, { n: "style.css", kb: 30, t: "css" }, { n: "app.js", kb: 80, t: "js" }, { n: "font.woff2", kb: 40, t: "font" }, { n: "hero.jpg", kb: 110, t: "img" }, { n: "logo.svg", kb: 6, t: "img" }, { n: "icon-1.png", kb: 4, t: "img" }, { n: "icon-2.png", kb: 4, t: "img" }, { n: "icon-3.png", kb: 4, t: "img" }, { n: "icon-4.png", kb: 4, t: "img" }];
  const TCOL = { html: "#ffb35c", css: "#7fd4ff", js: "#ffe08a", font: "#d7b4ff", img: "#7be0a6" };
  function simulate(mode) {
    const RTT = 40, BW = 1.5;
    const r = RES.map((x, i) => ({ ...x, i, left: x.kb, disc: i === 0 ? 0 : null, req: i === 0 ? 0 : null, start: i === 0 ? RTT : null, end: null, conn: i === 0 ? 0 : null }));
    const conns = [{ ready: 0, busy: 0 }];
    let t = 0;
    while (r.some((x) => x.end === null) && t < 20000) {
      const queued = r.filter((x) => x.disc !== null && x.req === null);
      if (queued.length) {
        if (mode === "h1") {
          const free = conns.filter((c) => c.busy === null && c.ready <= t).length, pending = conns.filter((c) => c.ready > t).length;
          let need = queued.length - free - pending;
          while (need > 0 && conns.length < 6) { conns.push({ ready: t + 2 * RTT, busy: null }); need--; }
          for (const c of conns) {
            if (c.busy !== null || c.ready > t) continue;
            const x = r.find((y) => y.disc !== null && y.req === null);
            if (!x) break;
            c.busy = x.i; x.conn = conns.indexOf(c); x.req = t; x.start = t + RTT;
          }
        } else queued.forEach((x) => { x.req = t; x.start = t + RTT; x.conn = 0; });
      }
      const act = r.filter((x) => x.start !== null && x.start <= t && x.end === null);
      if (act.length) {
        const share = BW / act.length;
        for (const x of act) {
          x.left -= share;
          if (x.left <= 0) {
            x.end = t + 1;
            if (mode === "h1") conns[x.conn].busy = null;
            if (x.i === 0) r.forEach((y) => { if (y.i > 0) y.disc = t + 1; });
          }
        }
      }
      t++;
    }
    return { r, total: Math.max(...r.map((x) => x.end)), conns: conns.length };
  }
  const SIMS = { h1: simulate("h1"), h2: simulate("h2") };
  const httpHost = $("#httpSvg");
  let httpMode = "h2", httpRun = 0, httpT = Infinity;
  function drawHttp() {
    const W = Math.max(300, httpHost.clientWidth), L = W < 520 ? 84 : 98, R = 14, rowH = 25, top = 28;
    const sim = SIMS[httpMode], maxT = Math.max(SIMS.h1.total, SIMS.h2.total) + 10, x = (t) => L + (t / maxT) * (W - L - R);
    const H = top + RES.length * rowH + 30, T = httpT;
    httpHost.innerHTML = "";
    const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "fig", role: "img", "aria-label": `${httpMode === "h1" ? "HTTP/1.1" : "HTTP/2"} waterfall: all files loaded at ${sim.total} milliseconds.` }, httpHost);
    const step = W < 520 ? 100 : 50;
    for (let t = 0; t <= maxT; t += step) {
      S("line", { x1: x(t), x2: x(t), y1: top - 6, y2: H - 22, class: "gridl" }, svg);
      S("text", { x: x(t), y: top - 12, "text-anchor": t === 0 ? "start" : "middle", class: "axis" }, svg, t === 0 ? "0 ms" : String(t));
    }
    sim.r.forEach((d, i) => {
      const y = top + i * rowH;
      S("text", { x: L - 8, y: y + 14, "text-anchor": "end", class: "rname" }, svg, d.n);
      if (d.disc !== null && d.req > d.disc && T > d.disc) S("line", { x1: x(d.disc), x2: x(Math.min(d.req, T)), y1: y + 10, y2: y + 10, class: "qline" }, svg);
      if (d.req !== null && T > d.req) S("line", { x1: x(d.req), x2: x(Math.min(d.start, T)), y1: y + 10, y2: y + 10, class: "wline" }, svg);
      if (T > d.start) {
        const e = Math.min(d.end, T), bw = Math.max(1.5, x(e) - x(d.start));
        S("rect", { x: x(d.start), y: y + 4, width: bw, height: 13, rx: 2, fill: TCOL[d.t], opacity: T >= d.end ? 1 : .6 }, svg);
        if (httpMode === "h1" && bw > 18) S("text", { x: x(d.start) + 3, y: y + 14, class: "ctag" }, svg, "c" + (d.conn + 1));
      }
    });
    if (T >= sim.total) {
      const lx = x(sim.total), right = lx < W - 130;
      S("line", { x1: lx, x2: lx, y1: top - 4, y2: H - 22, class: "done-line" }, svg);
      S("text", { x: right ? lx + 6 : lx - 6, y: H - 6, "text-anchor": right ? "start" : "end", class: "done-l" }, svg, `all loaded: ${sim.total} ms`);
    }
  }
  function httpSummary() {
    const a = SIMS.h1, b = SIMS.h2, s = SIMS[httpMode];
    $("#httpSum").textContent = httpMode === "h1"
      ? `HTTP/1.1 opened ${a.conns} connections, each paying its own handshake, and still queued files behind them. Everything arrived at ${a.total} ms.`
      : `HTTP/2 sent all nine requests at once over its single connection. Everything arrived at ${b.total} ms, ${Math.round((1 - b.total / a.total) * 100)}% sooner than HTTP/1.1.`;
    return s;
  }
  async function playHttp() {
    const run = ++httpRun, sim = SIMS[httpMode], fired = new Set();
    httpT = 0;
    await tween(2600, (e) => {
      httpT = e * (sim.total + 4);
      sim.r.forEach((d) => { if (d.end <= httpT && !fired.has(d.i)) { fired.add(d.i); Sound.cue.tick(500 + d.i * 70, 0, .05); } });
      drawHttp();
    }, () => run === httpRun);
    if (run !== httpRun) return;
    httpT = Infinity; drawHttp(); Sound.cue.good(); httpSummary();
  }
  $$('input[name="proto"]').forEach((r) => r.addEventListener("change", () => { httpMode = r.value; httpRun++; httpT = Infinity; drawHttp(); httpSummary(); playHttp(); }));
  $("#httpGo").addEventListener("click", playHttp);
  onResize(httpHost, drawHttp);
  drawHttp(); httpSummary();

  /* ================= 5. DOM parsing ================= */
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
  const domSrc = $("#domSrc"), tapeEl = $("#tape"), treeHost = $("#domTree");
  domSrc.value = DOM_DEFAULT;
  let domRun = 0, domNodes = [], domEls = [];
  const tokens = (src) => (src.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) || []).map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean);
  function buildTree(src) {
    const doc = new DOMParser().parseFromString(src, "text/html"), lower = src.toLowerCase(), out = [];
    const walk = (node, depth, parent) => {
      if (out.length >= 48) return;
      let label, kind;
      if (node.nodeType === 1) { label = `<${node.tagName.toLowerCase()}>`; kind = "el"; }
      else if (node.nodeType === 3) { const t = node.textContent.trim(); if (!t) return; label = `“${t.length > 12 ? t.slice(0, 11) + "…" : t}”`; kind = "text"; }
      else if (node.nodeType === 8) { label = "<!-- -->"; kind = "el"; }
      else return;
      const tag = node.nodeType === 1 ? node.tagName.toLowerCase() : "";
      const added = !!tag && !new RegExp("<" + tag + "[\\s>/]", "i").test(lower);
      const me = { label, kind, depth, parent, added, kids: [] };
      out.push(me); if (parent) parent.kids.push(me);
      if (node.nodeType === 1) [...node.childNodes].forEach((c) => walk(c, depth + 1, me));
    };
    walk(doc.documentElement, 0, null);
    return out;
  }
  function drawDom(hidden) {
    domRun++;
    const src = domSrc.value, nodes = buildTree(src);
    domNodes = nodes;
    let leaf = 0, maxD = 0;
    const place = (n) => { maxD = Math.max(maxD, n.depth); if (!n.kids.length) n.x = leaf++; else { n.kids.forEach(place); n.x = (n.kids[0].x + n.kids[n.kids.length - 1].x) / 2; } };
    if (nodes[0]) place(nodes[0]);
    const colW = 84, rowH = 56, padX = 46;
    const W = Math.max(treeHost.clientWidth || 300, leaf * colW + padX * 2 - colW + 20), H = (maxD + 1) * rowH + 20;
    const off = (W - ((leaf - 1) * colW)) / 2;
    const X = (n) => off + n.x * colW, Y = (n) => 24 + n.depth * rowH;
    treeHost.innerHTML = "";
    const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "fig", role: "img", "aria-label": `DOM tree with ${nodes.length} nodes: ${nodes.slice(0, 12).map((n) => n.label).join(", ")}${nodes.length > 12 ? "…" : ""}` }, treeHost);
    svg.style.maxWidth = "none";
    domEls = [];
    nodes.forEach((n) => {
      let link = null;
      if (n.parent) link = S("path", { d: `M${X(n.parent)} ${Y(n.parent) + 11} C${X(n.parent)} ${Y(n) - 20} ${X(n)} ${Y(n.parent) + 30} ${X(n)} ${Y(n) - 11}`, class: "dlink" + (hidden ? " hid" : "") }, svg);
      const g = S("g", { class: `dn ${n.kind === "text" ? "text" : ""} ${n.added ? "added" : ""}` + (hidden ? " hid" : "") }, svg);
      const w = Math.max(40, n.label.length * 7.4 + 14);
      S("rect", { x: X(n) - w / 2, y: Y(n) - 11, width: w, height: 22, rx: 11 }, g);
      S("text", { x: X(n), y: Y(n) + 4, "text-anchor": "middle" }, g, n.label);
      domEls.push({ g, link, n });
    });
    const toks = tokens(src);
    tapeEl.innerHTML = toks.map((t) => `<span>${esc(t.length > 40 ? t.slice(0, 39) + "…" : t)}</span>`).join("");
    tapeEl.style.transform = "translateX(0)";
    const added = nodes.filter((n) => n.added).length;
    $("#domSum").textContent = `${toks.length} tokens became ${nodes.length} DOM nodes${added ? `; ${added} element${added === 1 ? " was" : "s were"} added by the parser` : ""}.`;
    return { toks };
  }
  async function playDom() {
    const { toks } = drawDom(true), run = domRun, spans = $$("span", tapeEl);
    for (let i = 0; i < domEls.length; i++) {
      if (run !== domRun) return;
      const { g, link, n } = domEls[i];
      const k = Math.min(spans.length - 1, Math.round((i / Math.max(1, domEls.length - 1)) * (spans.length - 1)));
      spans.forEach((s, j) => { s.classList.toggle("cur", j === k); s.classList.toggle("past", j < k); });
      if (spans[k]) tapeEl.style.transform = `translateX(${-Math.max(0, spans[k].offsetLeft - 60)}px)`;
      g.classList.remove("hid"); if (link) link.classList.remove("hid");
      Sound.cue.tick(n.added ? 1300 : 420 + n.depth * 90, 0, n.added ? .05 : .035);
      await sleep(150);
    }
    spans.forEach((s) => { s.classList.remove("cur"); s.classList.add("past"); });
    if (toks.length) Sound.cue.good();
  }
  $("#domGo").addEventListener("click", playDom);
  $("#domSloppy").addEventListener("click", () => { domSrc.value = DOM_SLOPPY; playDom(); });
  $("#domReset").addEventListener("click", () => { domSrc.value = DOM_DEFAULT; drawDom(false); });
  let domDeb = 0;
  domSrc.addEventListener("input", () => { clearTimeout(domDeb); domDeb = setTimeout(() => drawDom(false), 250); });
  onResize(treeHost, () => drawDom(false));
  drawDom(false);

  /* ================= 6. Scripts ================= */
  const SC = {
    plain: { parse: [[0, 30], [85, 120]], pause: [[30, 85]], dl: [[30, 70]], run: [[70, 85]], dcl: 120, snip: '<script src="app.js"><\/script>', text: "The parser stops at the tag, waits for the download, runs the script, and only then reads on. Every millisecond the network takes is a millisecond the page isn’t being built." },
    async: { parse: [[0, 60], [75, 112]], pause: [[60, 75]], dl: [[30, 60]], run: [[60, 75]], dcl: 112, snip: '<script src="app.js" async><\/script>', text: "async downloads alongside parsing and runs the moment it arrives, pausing the parser only while it runs. Good for independent scripts like analytics; several async scripts may run in any order." },
    defer: { parse: [[0, 100]], pause: [], dl: [[30, 60]], run: [[100, 114]], dcl: 116, snip: '<script src="app.js" defer><\/script>', text: "defer downloads alongside parsing and waits until the document is fully parsed, then runs in order, just before DOMContentLoaded. Module scripts behave this way by default." }
  };
  const scHost = $("#scSvg");
  let scMode = "plain", scRun = 0, scT = Infinity;
  function drawSc() {
    const W = Math.max(300, scHost.clientWidth), L = 8, R = 12, top = 26, rowH = 62, m = SC[scMode], T = scT;
    const x = (t) => L + (t / 130) * (W - L - R), H = top + 3 * rowH + 20;
    scHost.innerHTML = "";
    const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "fig", role: "img", "aria-label": `Timeline for a ${scMode} script: DOMContentLoaded at ${m.dcl} milliseconds.` }, scHost);
    for (let t = 0; t <= 120; t += 20) S("text", { x: x(t), y: 12, "text-anchor": t === 0 ? "start" : "middle", class: "axis" }, svg, t === 0 ? "0 ms" : String(t));
    const rows = [["Parsing HTML", m.parse, "seg-parse"], ["Downloading app.js", m.dl, "seg-dl"], ["Running app.js", m.run, "seg-run"]];
    rows.forEach(([lbl, segs, cls], i) => {
      const y = top + i * rowH;
      S("text", { x: L, y: y + 14, class: "rowlbl" }, svg, lbl);
      S("line", { x1: L, x2: W - R, y1: y + 36, y2: y + 36, class: "gridl" }, svg);
      if (i === 0) m.pause.forEach(([a, b]) => {
        if (T <= a) return;
        const e = Math.min(b, T);
        S("rect", { x: x(a), y: y + 24, width: x(e) - x(a), height: 24, rx: 3, class: "seg-pause" }, svg);
        if (x(e) - x(a) > 60) S("text", { x: (x(a) + x(e)) / 2, y: y + 40, "text-anchor": "middle", class: "pause-l" }, svg, "paused");
      });
      segs.forEach(([a, b]) => { if (T <= a) return; const e = Math.min(b, T); S("rect", { x: x(a), y: y + 24, width: Math.max(1, x(e) - x(a)), height: 24, rx: 4, class: cls }, svg); });
    });
    if (T >= m.dcl) {
      const lx = x(m.dcl), right = lx < W - 140;
      S("line", { x1: lx, x2: lx, y1: top, y2: H - 8, class: "dcl" }, svg);
      S("text", { x: right ? lx + 6 : lx - 6, y: H - 10, "text-anchor": right ? "start" : "end", class: "dcl-l" }, svg, "DOMContentLoaded");
    }
    if (T < 130) S("line", { x1: x(T), x2: x(T), y1: top - 4, y2: H - 8, class: "cursor" }, svg);
  }
  async function playSc() {
    const run = ++scRun, m = SC[scMode], cues = new Set();
    $("#scSnip").textContent = m.snip; $("#scText").textContent = m.text;
    scT = 0;
    await tween(1700, (e) => {
      scT = e * 130;
      m.pause.forEach(([a]) => { if (scT >= a && !cues.has("p" + a)) { cues.add("p" + a); Sound.tone(150, { dur: .3, type: "triangle", gain: .08 }); } });
      m.dl.forEach(([a]) => { if (scT >= a && !cues.has("d" + a)) { cues.add("d" + a); Sound.cue.blip(660); } });
      m.run.forEach(([a]) => { if (scT >= a && !cues.has("r" + a)) { cues.add("r" + a); Sound.cue.note("G", 0, .3); } });
      if (scT >= m.dcl && !cues.has("dcl")) { cues.add("dcl"); Sound.cue.good(); }
      drawSc();
    }, () => run === scRun);
    if (run === scRun) { scT = Infinity; drawSc(); }
  }
  $$('input[name="sc"]').forEach((r) => r.addEventListener("change", () => { scMode = r.value; playSc(); }));
  onResize(scHost, drawSc);
  $("#scSnip").textContent = SC.plain.snip; $("#scText").textContent = SC.plain.text;
  drawSc();

  /* ================= 7. Layout ================= */
  const vp = $("#vp"), vpW = $("#vpW"), overlay = $("#overlay"), vpWrap = vp.parentElement;
  let lastTick = 0;
  function measure() {
    const t0 = performance.now();
    const base = vp.getBoundingClientRect();
    const rects = $$("[data-box]", vp).map((el) => [el.dataset.box, el.getBoundingClientRect()]);
    const t1 = performance.now();
    overlay.innerHTML = $("#showBoxes").checked ? rects.map(([n, r]) => `<div class="ob" style="left:${(r.left - base.left).toFixed(1)}px;top:${(r.top - base.top).toFixed(1)}px;width:${r.width.toFixed(1)}px;height:${r.height.toFixed(1)}px"><span>${esc(n)} ${Math.round(r.width)}×${Math.round(r.height)}</span></div>`).join("") : "";
    $("#layStat").textContent = `Viewport ${Math.round(base.width)} px wide. ${rects.length} boxes measured in ${(t1 - t0).toFixed(2)} ms.`;
    $("#vpOut").textContent = Math.round(base.width) + " px";
  }
  function fitVp() {
    const max = Math.max(260, Math.floor(vpWrap.clientWidth));
    vpW.max = String(max);
    if (+vpW.value > max || !vp.style.getPropertyValue("--vpw")) vpW.value = String(max);
    vp.style.setProperty("--vpw", vpW.value + "px");
    requestAnimationFrame(measure);
  }
  vpW.addEventListener("input", () => {
    vp.style.setProperty("--vpw", vpW.value + "px");
    requestAnimationFrame(measure);
    const v = +vpW.value;
    if (Math.abs(v - lastTick) >= 24) { lastTick = v; Sound.cue.tick(300 + v, 0, .03); }
  });
  $("#showBoxes").addEventListener("change", measure);
  onResize(vpWrap, fitVp);
  vp.addEventListener("transitionend", measure);
  fitVp();

  /* ================= 8. Paint ================= */
  const pcv = $("#pcv"), pctx = pcv.getContext("2d");
  (() => { const dpr = devicePixelRatio || 1; pcv.width = 320 * dpr; pcv.height = 220 * dpr; pctx.setTransform(dpr, 0, 0, dpr, 0, 0); })();
  const rr = (c, x, y, w, h, r, fill) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); c.fillStyle = fill; c.fill(); };
  const SANS = "'Atkinson Hyperlegible', system-ui, sans-serif";
  const DL = [
    ["drawRect", "page background", (c) => { c.fillStyle = "#fffdf8"; c.fillRect(0, 0, 320, 220); }],
    ["drawRect", "header bar", (c) => { c.fillStyle = "#2f5fb3"; c.fillRect(0, 0, 320, 38); }],
    ["drawText", "“hello, web”", (c) => { c.fillStyle = "#fff"; c.font = `bold 15px ${SANS}`; c.fillText("hello, web", 14, 25); }],
    ["drawRRect", "card", (c) => rr(c, 14, 52, 176, 112, 8, "#f3ead5"), "card"],
    ["drawText", "card title", (c) => { c.fillStyle = "#2a2420"; c.font = `bold 13px ${SANS}`; c.fillText("Paint is a list", 26, 76); }, "card"],
    ["drawRect", "4 text lines", (c) => { c.fillStyle = "#c9bfae"; [92, 104, 116, 128].forEach((y, i) => c.fillRect(26, y, i === 3 ? 90 : 150, 6)); }, "card"],
    ["drawImage", "hero.jpg", (c) => { const g = c.createLinearGradient(0, 52, 0, 164); g.addColorStop(0, "#9fd0ef"); g.addColorStop(1, "#fbe7b5"); c.fillStyle = g; c.fillRect(160, 52, 146, 112); c.fillStyle = "#f5d06f"; c.beginPath(); c.arc(276, 80, 12, 0, 7); c.fill(); c.fillStyle = "#5f9e7a"; c.beginPath(); c.moveTo(160, 164); c.lineTo(214, 108); c.lineTo(250, 140); c.lineTo(276, 120); c.lineTo(306, 164); c.fill(); }],
    ["drawRRect", "button", (c) => rr(c, 14, 176, 104, 30, 15, "#d9573f")],
    ["drawText", "“Read more”", (c) => { c.fillStyle = "#fff"; c.font = `bold 12px ${SANS}`; c.fillText("Read more", 36, 195); }]
  ];
  let pOrder = DL.map((_, i) => i), pN = DL.length, pRun = 0;
  const dlist = $("#dlist");
  function paintTo(n) {
    pN = n;
    pctx.clearRect(0, 0, 320, 220);
    if (n === 0) { pctx.fillStyle = "#132a5a"; pctx.fillRect(0, 0, 320, 220); pctx.fillStyle = "#a3b3d8"; pctx.font = `13px ${SANS}`; pctx.fillText("No draw calls yet", 104, 114); }
    for (let i = 0; i < n; i++) DL[pOrder[i]][2](pctx);
    dlist.innerHTML = pOrder.map((k, i) => `<li class="${i < n - 1 ? "done" : i === n - 1 ? "now" : ""}"><b>${DL[k][0]}</b><span>${DL[k][1]}</span></li>`).join("");
    $("#pSum").textContent = n === DL.length ? `All ${n} commands drawn.${$("#pSwap").checked ? " The card now covers part of the image, because it was drawn after it." : " The image overlaps the card’s edge: it was drawn later, so it lands on top."}` : `Command ${n} of ${DL.length}: ${n ? DL[pOrder[n - 1]][0] + " " + DL[pOrder[n - 1]][1] : "nothing drawn yet"}.`;
  }
  async function playPaint() {
    const run = ++pRun;
    for (let i = 0; i <= DL.length; i++) {
      if (run !== pRun) return;
      paintTo(i);
      if (i) Sound.cue.tick(440 + i * 70, 0, .05);
      await sleep(420);
    }
    if (run === pRun) Sound.cue.good();
  }
  $("#pPlay").addEventListener("click", playPaint);
  $("#pStep").addEventListener("click", () => { pRun++; const n = pN >= DL.length ? 0 : pN + 1; paintTo(n); Sound.cue.tick(440 + n * 70, 0, .05); });
  $("#pSwap").addEventListener("change", (e) => {
    const base = DL.map((_, i) => i);
    pOrder = e.target.checked ? [...base.filter((i) => DL[i][3] !== "card"), ...base.filter((i) => DL[i][3] === "card")] : base;
    pRun++; paintTo(DL.length); Sound.cue.blip(520);
  });
  paintTo(DL.length);

  /* ================= 9. Layers + animation cost ================= */
  const stack = $("#stack");
  $("#explode").addEventListener("input", (e) => { stack.style.setProperty("--e", (e.target.value / 100).toFixed(2)); $("#exOut").textContent = e.target.value + "%"; });
  const COST = {
    transform: { on: ["composite"], cls: "p-transform", text: "transform skips style, layout and paint entirely. The compositor just moves an already painted layer, often on the GPU, without touching the main thread. This is the cheap one." },
    opacity: { on: ["composite"], cls: "p-opacity", text: "opacity is also compositor-only. Fading a layer means blending it differently, not redrawing it." },
    color: { on: ["style", "paint", "composite"], cls: "p-color", text: "Changing a background color doesn’t move anything, so layout is skipped, but the box has to be repainted every frame." },
    width: { on: ["style", "layout", "paint", "composite"], cls: "p-width", text: "Width is the expensive one. Every frame, layout re-runs (and can push neighbors around), then paint, then composite. Use transform: scale() when you can." }
  };
  function setCost(k) {
    const c = COST[k], box = $("#demoBox");
    box.className = "demo-box " + c.cls;
    $$(".pchip").forEach((p) => p.classList.toggle("on", c.on.includes(p.dataset.st)));
    $("#costText").textContent = c.text;
    c.on.forEach((_, i) => Sound.cue.tick(500 + i * 160, i * .06, .05));
  }
  $$('input[name="prop"]').forEach((r) => r.addEventListener("change", () => setCost(r.value)));
  setCost("transform");

  /* ================= 10. Raster ================= */
  const RC = { cols: 8, rows: 10, vh: 4 }, WCOL = ["#ffb35c", "#7fd4ff", "#7be0a6", "#d7b4ff"];
  const rcv = $("#rcv"), rctx = rcv.getContext("2d"), rHost = $("#rHost");
  let tile = 40, rTop = 0, rDone = new Set(), rProg = new Map(), rRun = 0, pageCv = null;
  function rSize() {
    tile = Math.max(26, Math.floor(Math.min(rHost.clientWidth / RC.cols, 46)));
    const w = tile * RC.cols, h = tile * RC.rows, dpr = devicePixelRatio || 1;
    rcv.style.width = w + "px"; rcv.style.height = h + "px"; rcv.width = w * dpr; rcv.height = h * dpr;
    rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pageCv = document.createElement("canvas"); pageCv.width = w; pageCv.height = h;
    const c = pageCv.getContext("2d");
    c.fillStyle = "#fffdf8"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#2f5fb3"; c.fillRect(0, 0, w, tile * .8);
    c.fillStyle = "#fff"; c.font = `bold ${Math.round(tile * .38)}px ${SANS}`; c.fillText("hello, web", tile * .3, tile * .55);
    const g = c.createLinearGradient(0, tile, 0, tile * 3.6); g.addColorStop(0, "#9fd0ef"); g.addColorStop(1, "#fbe7b5");
    c.fillStyle = g; c.fillRect(tile * .3, tile * 1.1, w - tile * .6, tile * 2.5);
    c.fillStyle = "#f5d06f"; c.beginPath(); c.arc(w - tile * 1.5, tile * 1.8, tile * .4, 0, 7); c.fill();
    for (let r = 4; r < RC.rows; r++) {
      if (r % 3 === 1) { c.fillStyle = "#f3ead5"; c.fillRect(tile * .3, r * tile + 4, w * .45, tile * 2.4); c.fillStyle = "#fbe7b5"; c.fillRect(w * .52, r * tile + 4, w * .45, tile * 2.4); }
      c.fillStyle = "#c9bfae";
      for (let k = 0; k < 3; k++) c.fillRect(tile * .6, r * tile + tile * (.25 + k * .25), (w - tile * 1.2) * (k === 2 ? .6 : .9), 3);
    }
  }
  function inView(i) { const r = Math.floor(i / RC.cols); return r >= rTop && r < rTop + RC.vh; }
  function drawR() {
    const w = tile * RC.cols, h = tile * RC.rows;
    rctx.clearRect(0, 0, w, h);
    for (let i = 0; i < RC.cols * RC.rows; i++) {
      const x = (i % RC.cols) * tile, y = Math.floor(i / RC.cols) * tile;
      if (rDone.has(i)) rctx.drawImage(pageCv, x, y, tile, tile, x, y, tile, tile);
      else {
        if (inView(i)) { const q = tile / 4; for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) { rctx.fillStyle = (a + b) % 2 ? "#c7cfdf" : "#e9edf5"; rctx.fillRect(x + a * q, y + b * q, q, q); } }
        else { rctx.fillStyle = "#132a5a"; rctx.fillRect(x, y, tile, tile); }
        const p = rProg.get(i);
        if (p) {
          rctx.drawImage(pageCv, x, y, tile, tile * p.k, x, y, tile, tile * p.k);
          rctx.fillStyle = WCOL[p.w]; rctx.beginPath(); rctx.arc(x + tile - 7, y + 7, 4.5, 0, 7); rctx.fill();
          rctx.strokeStyle = WCOL[p.w]; rctx.lineWidth = 2; rctx.strokeRect(x + 1, y + 1, tile - 2, tile - 2);
        }
      }
      rctx.strokeStyle = "rgba(127,160,230,.28)"; rctx.lineWidth = 1; rctx.strokeRect(x + .5, y + .5, tile - 1, tile - 1);
    }
    rctx.strokeStyle = "#ffb35c"; rctx.lineWidth = 3; rctx.strokeRect(1.5, rTop * tile + 1.5, w - 3, RC.vh * tile - 3);
    rctx.fillStyle = "#ffb35c"; rctx.fillRect(4, rTop * tile + 4, 66, 16);
    rctx.fillStyle = "#1d1404"; rctx.font = "600 10px 'JetBrains Mono', monospace"; rctx.fillText("viewport", 9, rTop * tile + 15);
    const missing = [...Array(RC.cols * RC.rows).keys()].filter((i) => inView(i) && !rDone.has(i)).length;
    $("#rSum").textContent = `${rDone.size} of ${RC.cols * RC.rows} tiles rastered.${missing ? ` ${missing} tiles in view are still checkerboard.` : " Everything in view is ready."}`;
  }
  function rasterAll() {
    const run = ++rRun;
    const pick = () => {
      const free = [...Array(RC.cols * RC.rows).keys()].filter((i) => !rDone.has(i) && !rProg.has(i));
      const pr = (i) => { const r = Math.floor(i / RC.cols); return r < rTop ? rTop - r : r >= rTop + RC.vh ? r - (rTop + RC.vh - 1) : 0; };
      free.sort((a, b) => pr(a) - pr(b) || a - b);
      return free[0];
    };
    const worker = async (w) => {
      while (run === rRun) {
        const next = pick();
        if (next === undefined) return;
        rProg.set(next, { w, k: 0 });
        const ok = await tween(230, (e) => { const p = rProg.get(next); if (p) { p.k = e; drawR(); } }, () => run === rRun);
        rProg.delete(next);
        if (!ok) return;
        rDone.add(next); Sound.cue.tick(520 + w * 160, 0, .022); drawR();
      }
    };
    Promise.all([0, 1, 2, 3].map(worker)).then(() => { if (run === rRun) Sound.cue.good(); });
  }
  $("#rGo").addEventListener("click", () => { rRun++; rDone = new Set(); rProg = new Map(); rTop = 0; drawR(); rasterAll(); });
  $("#rScroll").addEventListener("click", () => {
    rTop = rTop + 3 > RC.rows - RC.vh ? 0 : rTop + 3; Sound.cue.blip(400);
    drawR();
    if (![...rProg.keys()].length) rasterAll();
  });
  onResize(rHost, () => { rSize(); drawR(); });
  rSize();
  for (let i = 0; i < RC.cols * RC.rows; i++) rDone.add(i);
  drawR();
  // Frame counter: real frames composited while the scene is on screen.
  let fN = 0, fVis = false, fLast = 0;
  const fTick = (t) => {
    fN++;
    $("#fClock").textContent = `Frames composited while you’ve been here: ${fN.toLocaleString()} (last one took ${(t - fLast).toFixed(1)} ms of a 16.7 ms budget)`;
    $("#fBar").style.width = Math.min(100, ((t - fLast) / 16.7) * 100).toFixed(1) + "%";
    fLast = t;
    if (fVis) requestAnimationFrame(fTick);
  };
  new IntersectionObserver((es) => { const v = es[0].isIntersecting; if (v && !fVis) { fVis = true; fLast = performance.now(); requestAnimationFrame(fTick); } fVis = v; }).observe($("#s-raster"));

  /* ================= 11. V8 tiers ================= */
  const TIERS = [
    { n: "Ignition", d: "interpreter: runs bytecode", at: 0, speed: 1, code: "; bytecode, run one instruction at a time\nLdar a1\nAdd a0, [0]\nReturn" },
    { n: "Sparkplug", d: "baseline compiler: fast to build", at: 200, speed: 2.5, code: "; the same bytecode, translated straight to\n; machine code, with no optimizations\ncall  Builtin::Add\nret" },
    { n: "Maglev", d: "mid-tier optimizer", at: 2000, speed: 8, code: "; bet: a and b are always small integers\ncheck_small_int a\ncheck_small_int b\nadd   r1, r2\njo    deopt          ; overflow? bail out\nret" },
    { n: "TurboFan", d: "top-tier optimizer", at: 15000, speed: 20, code: "; same bet, fully optimized and inlined\n; into its callers\nadd   eax, ebx\njo    deopt\nret" }
  ];
  let v8Calls = 0, v8Warm = 0, v8Tier = 0, v8Busy = 0, v8Poly = false;
  $("#tiers").innerHTML = TIERS.map((t) => `<li><b>${t.n}</b><span>${t.d}</span></li>`).join("");
  const tierFor = (w) => TIERS.reduce((a, t, i) => (w >= t.at ? i : a), 0);
  function renderV8() {
    $("#v8Calls").textContent = Math.round(v8Calls).toLocaleString();
    $$("#tiers li").forEach((li, i) => { li.classList.toggle("on", i === v8Tier); li.classList.toggle("past", i < v8Tier); });
    const t = TIERS[v8Tier], nx = TIERS[v8Tier + 1];
    $("#v8Speed").textContent = t.speed + "×";
    $("#v8Code").textContent = t.code + (v8Poly && v8Tier >= 2 ? "\n; now also handles strings: slower, but safe" : "");
    const frac = Math.log(t.speed) / Math.log(20);
    $("#needle").style.transform = `rotate(${(-90 + frac * 180).toFixed(1)}deg)`;
    $("#gArc").style.strokeDashoffset = String(239 * (1 - frac));
    $("#v8Heat").style.width = nx ? Math.min(100, ((v8Warm - t.at) / (nx.at - t.at)) * 100).toFixed(1) + "%" : "100%";
    $("#v8Next").textContent = nx ? `${Math.max(0, Math.ceil(nx.at - v8Warm)).toLocaleString()} more calls until ${nx.n}` : "Fully optimized.";
  }
  async function callV8(n) {
    const run = ++v8Busy, w0 = v8Warm, c0 = v8Calls;
    await tween(Math.min(1400, 300 + Math.log10(n) * 280), (e) => {
      v8Warm = w0 + n * e; v8Calls = c0 + n * e;
      const nt = tierFor(v8Warm);
      if (nt > v8Tier) {
        v8Tier = nt; Sound.cue.note(["C", "E", "G", "B"][nt], 0, .5); Sound.tone(220 * Math.pow(2, nt / 2), { dur: .5, gain: .05, slide: 1.5, type: "triangle" });
        $("#v8Msg").textContent = `Hot code: compiled by ${TIERS[nt].n}. It now runs about ${TIERS[nt].speed}× faster than the interpreter.`;
      }
      renderV8();
    }, () => run === v8Busy);
    renderV8();
  }
  $$("[data-calls]").forEach((b) => b.addEventListener("click", () => { Sound.cue.tick(900); callV8(+b.dataset.calls); }));
  $("#v8Str").addEventListener("click", () => {
    v8Busy++; v8Calls += 1;
    if (v8Tier >= 2) {
      v8Tier = 0; v8Warm = 0; v8Poly = true;
      restart($("#v8Code"), "flash-bad"); Sound.cue.bad(); Sound.cue.thud(.1);
      $("#v8Msg").textContent = "Deoptimized. The optimized code bet on two numbers and got a string, so V8 threw it away and fell back to the interpreter. It will warm up again, this time with code that expects both types.";
    } else {
      Sound.cue.blip(500);
      $("#v8Msg").textContent = `${TIERS[v8Tier].n} doesn’t make type bets, so a string is fine here: add('1', 2) just returns '12'. Optimized tiers are the ones that can bail out.`;
    }
    renderV8();
  });
  $("#v8Reset").addEventListener("click", () => { v8Busy++; v8Calls = 0; v8Warm = 0; v8Tier = 0; v8Poly = false; $("#v8Msg").textContent = "Back to cold code."; renderV8(); });
  renderV8();

  /* ================= 12. Garbage collection ================= */
  const gcHost = $("#gcSvg");
  let gid = 0, objs = new Map(), edges = [], gcBusy = false, gcL = null;
  const ROOTS = ["window", "stack"];
  function gcInit() {
    gid = 0; objs = new Map(); edges = [];
    const mk = (gen, slot, age = 0) => { const id = ++gid; objs.set(id, { id, gen, slot, age }); return id; };
    const a = mk("young", 0), b = mk("young", 1), c = mk("young", 2), d = mk("young", 5), e = mk("young", 6), f = mk("old", 0, 2), g = mk("old", 3, 2);
    edges = [["window", a], [a, b], ["stack", c], [d, e], ["window", f], [f, b]];
    void g;
  }
  function gcLayout() {
    const W = Math.max(300, gcHost.clientWidth), wide = W >= 560;
    const H = wide ? 360 : 560, rootsY = 30;
    const young = wide ? { x: 6, y: 70, w: W / 2 - 12, h: H - 78 } : { x: 6, y: 70, w: W - 12, h: 228 };
    const old = wide ? { x: W / 2 + 6, y: 70, w: W / 2 - 12, h: H - 78 } : { x: 6, y: 318, w: W - 12, h: 228 };
    const slot = (reg, k) => ({ x: reg.x + ((k % 4) + .5) * reg.w / 4, y: reg.y + 40 + (Math.floor(k / 4) + .5) * (reg.h - 48) / 3 });
    const rootPos = { window: { x: W * .3, y: rootsY }, stack: { x: W * .7, y: rootsY } };
    return { W, H, young, old, slot, rootPos };
  }
  const posOf = (k) => (typeof k === "string" ? gcL.rootPos[k] : gcL.slot(objs.get(k).gen === "young" ? gcL.young : gcL.old, objs.get(k).slot));
  function reachable() {
    const seen = new Set(), order = [], q = [...ROOTS];
    while (q.length) {
      const k = q.shift();
      for (const [a, b] of edges) if (a === k && objs.has(b) && !seen.has(b)) { seen.add(b); order.push(b); q.push(b); }
    }
    return { seen, order };
  }
  function drawGc(marked = new Set(), cut = null) {
    gcL = gcLayout();
    const { W, H, young, old } = gcL;
    gcHost.innerHTML = "";
    const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "fig", role: "img", "aria-label": `Heap with ${objs.size} objects: ${[...objs.values()].filter((o) => o.gen === "young").length} young and ${[...objs.values()].filter((o) => o.gen === "old").length} old.` }, gcHost);
    const defs = S("defs", {}, svg), m = S("marker", { id: "gcA", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" }, defs);
    S("path", { d: "M0,0 L10,5 L0,10 z", class: "mk-ink" }, m);
    [[young, "nursery (young)"], [old, "old generation"]].forEach(([r, l]) => {
      S("rect", { x: r.x, y: r.y, width: r.w, height: r.h, rx: 14, class: "region" }, svg);
      S("text", { x: r.x + 12, y: r.y + 26, class: "region-l" }, svg, l);
    });
    edges.forEach(([a, b]) => {
      if (!objs.has(b) || (typeof a !== "string" && !objs.has(a))) return;
      const p = posOf(a), q = posOf(b), dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1;
      const sx = p.x + dx / len * 20, sy = p.y + dy / len * 18, ex = q.x - dx / len * 24, ey = q.y - dy / len * 20;
      const mx = (sx + ex) / 2 - dy * .12, my = (sy + ey) / 2 + dx * .12;
      S("path", { d: `M${sx} ${sy} Q${mx} ${my} ${ex} ${ey}`, class: "edge" + (cut && cut[0] === a && cut[1] === b ? " cut" : ""), "marker-end": "url(#gcA)" }, svg);
    });
    ROOTS.forEach((k) => {
      const p = gcL.rootPos[k], g = S("g", { class: "root" + (marked.size ? " mark" : "") }, svg);
      S("rect", { x: p.x - 36, y: p.y - 14, width: 72, height: 28, rx: 14 }, g);
      S("text", { x: p.x, y: p.y + 4, "text-anchor": "middle" }, g, k);
    });
    for (const o of objs.values()) {
      const p = posOf(o.id), g = S("g", { class: `blob ${o.gen}${marked.has(o.id) ? " mark" : ""}`, "data-id": o.id, transform: `translate(${p.x},${p.y})` }, svg);
      S("rect", { x: -20, y: -17, width: 40, height: 34, rx: 11 }, g);
      S("circle", { cx: -7, cy: -3, r: 2.6, fill: "#2a2420" }, g); S("circle", { cx: 7, cy: -3, r: 2.6, fill: "#2a2420" }, g);
      S("path", { d: "M-4 5 q4 3 8 0", stroke: "#2a2420", "stroke-width": 1.6, fill: "none", "stroke-linecap": "round" }, g);
      S("text", { x: 0, y: 30, "text-anchor": "middle" }, g, `#${o.id}${o.gen === "young" ? " · age " + o.age : ""}`);
    }
    const { seen } = reachable();
    const garbage = [...objs.keys()].filter((k) => !seen.has(k)).length;
    $("#gcStats").innerHTML = `<span><b>${objs.size - garbage}</b>reachable</span><span><b>${garbage}</b>garbage</span><span><b>${[...objs.values()].filter((o) => o.gen === "old").length}</b>in old generation</span>`;
    return svg;
  }
  const freeSlot = (gen) => { const used = new Set([...objs.values()].filter((o) => o.gen === gen).map((o) => o.slot)); for (let k = 0; k < 12; k++) if (!used.has(k)) return k; return -1; };
  async function collect(kind) {
    const { seen, order } = reachable();
    const msg = $("#gcMsg");
    msg.textContent = "Marking: following references from the roots…";
    const marked = new Set();
    drawGc(marked);
    for (const id of order) {
      if (kind === "minor" && objs.get(id).gen === "old") { marked.add(id); continue; }
      marked.add(id); drawGc(marked); Sound.cue.tick(700 + marked.size * 60, 0, .04);
      await sleep(170);
    }
    const doomed = [...objs.values()].filter((o) => !seen.has(o.id) && (kind === "major" || o.gen === "young"));
    const svg = drawGc(marked);
    doomed.forEach((o) => { const el = svg.querySelector(`.blob[data-id="${o.id}"]`); if (el) el.classList.add("gone"); });
    if (doomed.length) Sound.cue.pop(); else Sound.cue.blip(400);
    await sleep(500);
    doomed.forEach((o) => objs.delete(o.id));
    edges = edges.filter(([a, b]) => objs.has(b) && (typeof a === "string" || objs.has(a)));
    let promoted = 0;
    if (kind === "minor") for (const o of objs.values()) {
      if (o.gen !== "young") continue;
      o.age++;
      if (o.age >= 2) { const s = freeSlot("old"); if (s >= 0) { o.gen = "old"; o.slot = s; promoted++; } }
    }
    drawGc();
    if (promoted) Sound.cue.note("G", 0, .4);
    msg.textContent = `${kind === "minor" ? "Minor GC swept the nursery" : "Major GC swept the whole heap"}: freed ${doomed.length} object${doomed.length === 1 ? "" : "s"}${promoted ? `, promoted ${promoted} survivor${promoted === 1 ? "" : "s"} to the old generation` : ""}.${kind === "minor" && [...objs.values()].some((o) => o.gen === "old" && !reachable().seen.has(o.id)) ? " Some unreachable objects remain in the old generation; only a major GC frees those." : ""}`;
  }
  async function guard(fn) { if (gcBusy) return; gcBusy = true; $$("#s-gc .btn").forEach((b) => (b.disabled = true)); try { await fn(); } finally { gcBusy = false; $$("#s-gc .btn").forEach((b) => (b.disabled = false)); } }
  $("#gcAlloc").addEventListener("click", () => guard(async () => {
    if (freeSlot("young") < 0) { $("#gcMsg").textContent = "The nursery is full, so a minor GC runs first."; await sleep(500); await collect("minor"); }
    const s = freeSlot("young");
    if (s < 0) { $("#gcMsg").textContent = "Still full: everything in the nursery is reachable. Drop some references first."; Sound.cue.bad(); return; }
    const id = ++gid; objs.set(id, { id, gen: "young", slot: s, age: 0 });
    const { seen } = reachable(), pool = [...ROOTS, ...seen];
    const from = pool[Math.floor(Math.random() * pool.length)];
    edges.push([from, id]);
    drawGc(); Sound.cue.blip(660 + (id % 6) * 60);
    $("#gcMsg").textContent = `Created object #${id}, referenced from ${typeof from === "string" ? from : "#" + from}.`;
  }));
  $("#gcDrop").addEventListener("click", () => guard(async () => {
    if (!edges.length) { $("#gcMsg").textContent = "No references left to drop."; return; }
    const e = edges[Math.floor(Math.random() * edges.length)];
    drawGc(new Set(), e); Sound.cue.tone(300, { dur: .2, slide: .5, gain: .06, type: "triangle" });
    await sleep(600);
    edges = edges.filter((x) => x !== e);
    drawGc();
    const lost = [...objs.keys()].filter((k) => !reachable().seen.has(k)).length;
    $("#gcMsg").textContent = `${typeof e[0] === "string" ? e[0] : "#" + e[0]} no longer points to #${e[1]}. ${lost} object${lost === 1 ? " is" : "s are"} now unreachable, but nothing is freed until the collector runs.`;
  }));
  $("#gcMinor").addEventListener("click", () => guard(() => collect("minor")));
  $("#gcMajor").addEventListener("click", () => guard(() => collect("major")));
  gcInit();
  onResize(gcHost, () => drawGc());
  drawGc();
  $("#gcMsg").textContent = "Objects #4 and #5 aren’t reachable from any root. #7 sits in the old generation, unreferenced.";

  /* ================= 13. Processes ================= */
  const SITE_COL = { "shop.example": "#d9573f", "mail.example": "#2f5fb3", "news.example": "#2f7d4f", "maps.example": "#8a5bc2", "ads.example": "#b8860b" };
  let tabs = [{ id: 1, site: "shop.example", frame: null }, { id: 2, site: "mail.example", frame: null }], activeTab = 1, tabSeq = 2, crashed = new Set(), seenRenderers = new Set();
  function renderers() {
    const m = new Map();
    tabs.forEach((t) => {
      if (!m.has(t.site)) m.set(t.site, []);
      m.get(t.site).push(`tab ${t.id}`);
      if (t.frame) { if (!m.has(t.frame)) m.set(t.frame, []); m.get(t.frame).push(`iframe in tab ${t.id}`); }
    });
    return m;
  }
  function renderProc() {
    const R = renderers();
    $("#tabs").innerHTML = tabs.map((t) => `<span class="tabbtn${t.id === activeTab ? " on" : ""}"><button type="button" role="tab" aria-selected="${t.id === activeTab}" data-tab="${t.id}">${t.site}</button><button type="button" class="x" aria-label="Close ${t.site} tab" data-close="${t.id}">×</button></span>`).join("");
    const t = tabs.find((x) => x.id === activeTab);
    const view = $("#tabView");
    if (!t) view.innerHTML = `<p class="note">No tabs open. Open one with the buttons on the left.</p>`;
    else if (crashed.has(t.site)) view.innerHTML = `<div class="sad"><b>This tab’s renderer process crashed.</b><span>The other tabs kept running, because each site lives in its own process.</span><button type="button" class="btn sm" data-reload="${t.site}">Reload</button></div>`;
    else view.innerHTML = `<div class="site-h" style="background:${SITE_COL[t.site]}">${t.site}</div><div class="site-l" style="width:80%"></div><div class="site-l" style="width:64%"></div>` +
      (t.frame ? (crashed.has(t.frame) ? `<div class="iframe" style="border-color:var(--bad)"><b style="color:var(--bad)">This frame crashed.</b><span>The ${t.site} page around it is fine.</span></div>` : `<div class="iframe"><span>iframe · ${t.frame}</span><div class="site-l" style="width:50%;background:#e8d39a"></div></div>`) : "") +
      `<div class="site-l" style="width:72%"></div>`;
    const fixed = [["hall", "Browser process", "window, tabs, address bar"], ["factory", "GPU process", "composites every frame"], ["tower", "Network service", "fetches for everyone"]];
    $("#town").innerHTML = fixed.map(([ic, n, s]) => `<div class="proc"><svg viewBox="0 0 80 70" aria-hidden="true"><use href="#${ic}"/></svg><b>${n}</b><small>${s}</small></div>`).join("") +
      [...R.entries()].map(([site, users]) => {
        const isNew = !seenRenderers.has(site); seenRenderers.add(site);
        const c = crashed.has(site);
        return `<div class="proc renderer${c ? " crashed" : ""}${isNew ? " new" : ""}"><svg viewBox="0 0 80 70" aria-hidden="true"><use href="#house"/></svg><b>Renderer · ${site}</b><small>${users.join(", ")}${c ? " · crashed" : ""}</small>${c ? `<button type="button" class="btn sm" data-reload="${site}">Restart</button>` : `<button type="button" class="btn sm" data-crash="${site}">Crash it</button>`}</div>`;
      }).join("");
    $("#procMsg").textContent = `${3 + R.size} processes running: 3 shared, plus ${R.size} renderer${R.size === 1 ? "" : "s"}, one per site.`;
  }
  $("#s-proc").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.open) {
      if (tabs.length >= 5) { $("#procMsg").textContent = "That’s enough tabs for this demo. Close one first."; return; }
      const site = b.dataset.open, id = ++tabSeq;
      tabs.push({ id, site, frame: null }); activeTab = id; Sound.cue.blip(600 + tabs.length * 60); renderProc();
      $("#procMsg").textContent += renderers().get(site).length > 1 ? ` ${site} already had a renderer, so the new tab shares it.` : ` ${site} got a brand-new renderer.`;
    } else if (b.id === "addFrame") {
      const t = tabs.find((x) => x.id === activeTab);
      if (!t) return;
      if (t.frame) { $("#procMsg").textContent = "This tab already has an ad iframe."; return; }
      t.frame = "ads.example"; Sound.cue.blip(880); renderProc();
      $("#procMsg").textContent = `ads.example is a different site from ${t.site}, so its iframe runs in a separate renderer. The page can’t read the ad’s memory, and the ad can’t read the page’s.`;
    } else if (b.dataset.tab) { activeTab = +b.dataset.tab; Sound.cue.tick(800); renderProc(); }
    else if (b.dataset.close) { tabs = tabs.filter((x) => x.id !== +b.dataset.close); if (activeTab === +b.dataset.close) activeTab = tabs[0]?.id; Sound.cue.tick(500); const R = renderers(); [...crashed].forEach((s) => { if (!R.has(s)) crashed.delete(s); }); [...seenRenderers].forEach((s) => { if (!R.has(s)) seenRenderers.delete(s); }); renderProc(); }
    else if (b.dataset.crash) { crashed.add(b.dataset.crash); Sound.cue.thud(); renderProc(); $("#procMsg").textContent = `The ${b.dataset.crash} renderer crashed. Switch tabs: everything else still works.`; }
    else if (b.dataset.reload) { crashed.delete(b.dataset.reload); Sound.cue.good(); renderProc(); }
  });
  renderProc();

  /* ================= Outro ================= */
  let tripRun = 0;
  $("#tripGo").addEventListener("click", async () => {
    const run = ++tripRun, links = $$("#trip a"), notes = ["C", "D", "E", "F", "G", "A", "B", "C", "D", "E", "F", "G", "A"];
    links.forEach((a) => a.classList.remove("lit"));
    const pip = $("#outroPip");
    for (let i = 0; i < links.length; i++) {
      if (run !== tripRun) return;
      links[i].classList.add("lit");
      restart(pip, "hop"); pip.classList.add("pip-g");
      Sound.tone((i > 6 ? 2 : 1) * ({ C: 261.6, D: 293.7, E: 329.6, F: 349.2, G: 392, A: 440, B: 493.9 }[notes[i]]), { dur: .3, gain: .09, type: "triangle" });
      await sleep(240);
    }
    Sound.cue.good(.1);
  });
})();

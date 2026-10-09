import { $, $$, S, tween, onResize } from "../core/utils.js";

export const initHandshake = ({ sound }) => {
  const HS = {
    1.3: [
      ["→", "SYN", "tcp"],
      ["←", "SYN-ACK", "tcp"],
      ["→", "ACK + ClientHello", "tls"],
      ["←", "ServerHello + cert + Finished", "tls"],
      ["→", "Finished + GET /", "http"],
      ["←", "200 OK + first bytes", "http"],
    ],
    1.2: [
      ["→", "SYN", "tcp"],
      ["←", "SYN-ACK", "tcp"],
      ["→", "ACK + ClientHello", "tls"],
      ["←", "ServerHello + certificate", "tls"],
      ["→", "Key exchange + Finished", "tls"],
      ["←", "Finished", "tls"],
      ["→", "GET /", "http"],
      ["←", "200 OK + first bytes", "http"],
    ],
  };
  const hsHost = $("#hsSvg");
  let hsVer = "1.3",
    hsRun = 0,
    hsGeo = null;
  function hsSummary() {
    const rtt = +$("#rtt").value,
      n = HS[hsVer].length / 2;
    $("#rttOut").textContent = rtt + " ms";
    $("#hsMs").textContent = n * rtt + " ms";
    $("#hsSum").textContent =
      `${n} round trips × ${rtt} ms before the first byte of the page arrives${hsVer === "1.2" ? ", one more than TLS 1.3" : ""}.`;
  }
  function drawHs() {
    hsRun++;
    const W = Math.max(300, hsHost.clientWidth),
      L = 58,
      R = W - 58,
      top = 104,
      rowH = 46,
      msgs = HS[hsVer];
    const H = top + msgs.length * rowH + 16;
    hsHost.innerHTML = "";
    const svg = S(
      "svg",
      {
        viewBox: `0 0 ${W} ${H}`,
        width: W,
        height: H,
        class: "fig",
        role: "img",
        "aria-label": `Sequence diagram of a TLS ${hsVer} connection: ${msgs.map((m) => m[1]).join(", ")}.`,
      },
      hsHost,
    );
    const defs = S("defs", {}, svg);
    ["tcp", "tls", "http"].forEach((k) => {
      const m = S(
        "marker",
        {
          id: "hm-" + k,
          viewBox: "0 0 10 10",
          refX: 9,
          refY: 5,
          markerWidth: 7,
          markerHeight: 7,
          orient: "auto-start-reverse",
        },
        defs,
      );
      S("path", { d: "M0,0 L10,5 L0,10 z", class: "mk-" + k }, m);
    });
    S("use", { href: "#pip", x: L - 28, y: 8, width: 56, height: 60 }, svg);
    S("use", { href: "#server", x: R - 22, y: 6, width: 44, height: 63 }, svg);
    S(
      "text",
      { x: L, y: 88, "text-anchor": "middle", class: "hand-l" },
      svg,
      "browser",
    );
    S(
      "text",
      { x: R, y: 88, "text-anchor": "middle", class: "hand-l" },
      svg,
      "server",
    );
    S("line", { x1: L, x2: L, y1: top - 8, y2: H - 6, class: "life" }, svg);
    S("line", { x1: R, x2: R, y1: top - 8, y2: H - 6, class: "life" }, svg);
    const geo = [];
    msgs.forEach((m, i) => {
      const y0 = top + i * rowH,
        y1 = y0 + rowH * 0.74,
        [x0, x1] = m[0] === "→" ? [L, R] : [R, L];
      const g = S("g", { class: "msg " + m[2] }, svg);
      S(
        "line",
        { x1: x0, y1: y0, x2: x1, y2: y1, "marker-end": `url(#hm-${m[2]})` },
        g,
      );
      S(
        "text",
        { x: (L + R) / 2, y: (y0 + y1) / 2 - 7, "text-anchor": "middle" },
        g,
        m[1],
      );
      geo.push({ g, x0, y0, x1, y1, kind: m[2] });
      if (i % 2 === 1)
        S("text", { x: 2, y: y1 + 4, class: "rtt" }, svg, `RTT ${(i + 1) / 2}`);
    });
    const env = S(
      "use",
      { href: "#pip", width: 30, height: 32, style: "display:none" },
      svg,
    );
    hsGeo = { geo, env };
  }
  async function playHs() {
    drawHs();
    const run = hsRun,
      { geo, env } = hsGeo;
    geo.forEach((m) => (m.g.style.opacity = 0.12));
    env.style.display = "";
    for (const m of geo) {
      sound.cue.blip(m.kind === "tcp" ? 520 : m.kind === "tls" ? 700 : 880);
      const ok = await tween(
        560,
        (e) => {
          env.setAttribute("x", m.x0 + (m.x1 - m.x0) * e - 15);
          env.setAttribute("y", m.y0 + (m.y1 - m.y0) * e - 30);
          m.g.style.opacity = 0.12 + 0.88 * e;
        },
        () => run === hsRun,
      );
      if (!ok) return;
      m.g.style.opacity = 1;
    }
    env.style.display = "none";
    sound.cue.good();
  }
  $$('input[name="tls"]').forEach((r) =>
    r.addEventListener("change", () => {
      hsVer = r.value;
      drawHs();
      hsSummary();
    }),
  );
  $("#rtt").addEventListener("input", hsSummary);
  $("#hsGo").addEventListener("click", playHs);
  onResize(hsHost, drawHs);
  drawHs();
  hsSummary();
};

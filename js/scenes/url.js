import { $, $$, esc, restart } from "../core/utils.js";

export const initUrl = ({ sound, state, onHostChange }) => {
  const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
  function classify(raw) {
    const t = raw.trim();
    if (!t) return { kind: "empty" };
    const local = /^localhost(:\d+)?(\/|$)/i.test(t);
    const looksHost =
      HAS_SCHEME.test(t) ||
      local ||
      /^[^\s/]+\.[a-z0-9-]{2,}(:\d+)?([/?#]|$)/i.test(t);
    if (/\s/.test(t) || !looksHost) return { kind: "search", q: t };
    try {
      const u = new URL(
        HAS_SCHEME.test(t) ? t : (local ? "http://" : "https://") + t,
      );
      return { kind: "url", u, added: !HAS_SCHEME.test(t) };
    } catch (e) {
      return { kind: "search", q: t };
    }
  }
  const urlIn = $("#urlIn"),
    urlParts = $("#urlParts"),
    urlVerdict = $("#urlVerdict");
  function renderUrl(animate) {
    const r = classify(urlIn.value);
    const cls = animate ? "part new" : "part";
    if (r.kind === "empty") {
      urlParts.innerHTML = "";
      urlVerdict.textContent = "Type something in the address bar.";
      return r;
    }
    if (r.kind === "search") {
      urlParts.innerHTML = `<div class="${cls} wide"><dt>search query</dt><dd>${esc(r.q)}</dd><small>sent to your search engine</small></div>`;
      urlVerdict.textContent = `That doesn’t look like an address, so the browser would search for “${r.q}” instead.`;
      return r;
    }
    const u = r.u,
      def =
        u.protocol === "https:" ? "443" : u.protocol === "http:" ? "80" : "";
    const P = [
      [
        "scheme",
        u.protocol.replace(":", ""),
        r.added ? "filled in for you" : "",
      ],
      ["host", u.hostname, ""],
      ["port", u.port || def, u.port ? "" : "default"],
      ["path", u.pathname, ""],
      ["query", u.search || "none", ""],
      ["fragment", u.hash || "none", u.hash ? "never sent to the server" : ""],
    ];
    urlParts.innerHTML = P.map(
      ([k, v, n], i) =>
        `<div class="${cls}" style="animation-delay:${i * 60}ms"><dt>${k}</dt><dd>${esc(v)}</dd>${n ? `<small>${esc(n)}</small>` : ""}</div>`,
    ).join("");
    urlVerdict.textContent = `That’s an address. The browser will connect to ${u.hostname} on port ${u.port || def} over ${u.protocol.replace(":", "").toUpperCase()}.${r.added ? ` You didn’t type a scheme, so it assumed ${u.protocol}//.` : ""}`;
    return r;
  }
  urlIn.addEventListener("input", () => renderUrl(false));
  $("#urlForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const r = renderUrl(true),
      pip = $("#pipUrl");
    if (r.kind === "url") {
      state.hostname = r.u.hostname;
      $("#urlTab").textContent = state.hostname;
      onHostChange();
      restart(pip, "hop");
      sound.cue.boing();
      r.added ? sound.cue.note("E", 0.25) : sound.cue.note("C", 0.25);
    } else if (r.kind === "search") {
      $("#urlTab").textContent = "Search results";
      restart(pip, "shake");
      sound.cue.blip(440);
    }
  });
  $$("[data-try]").forEach((b) =>
    b.addEventListener("click", () => {
      urlIn.value = b.dataset.try;
      renderUrl(true);
      urlIn.focus();
      sound.cue.tick(900);
    }),
  );
  renderUrl(false);
};

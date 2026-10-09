const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const NS = "http://www.w3.org/2000/svg";
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
function S(tag, attrs = {}, parent, text) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs)
    if (attrs[k] !== undefined && attrs[k] !== null)
      n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
}
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
function tween(dur, fn, live = () => true) {
  return new Promise((res) => {
    if (reduce.matches) {
      fn(1, 1);
      setTimeout(() => res(live()), Math.min(dur, 160));
      return;
    }
    const t0 = performance.now();
    const step = (now) => {
      if (!live()) return res(false);
      const k = Math.min(1, (now - t0) / dur);
      fn(ease(k), k);
      if (k < 1) requestAnimationFrame(step);
      else res(true);
    };
    requestAnimationFrame(step);
  });
}
const sleep = (ms) =>
  new Promise((r) => setTimeout(r, reduce.matches ? Math.min(ms, 100) : ms));
function onResize(el, fn) {
  let w = 0,
    raf = 0;
  new ResizeObserver(() => {
    const nw = el.clientWidth;
    if (!nw || nw === w) return;
    w = nw;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(fn);
  }).observe(el);
}
function edgePt(a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.min(
    dx ? a.w / 2 / Math.abs(dx) : Infinity,
    dy ? a.h / 2 / Math.abs(dy) : Infinity,
  );
  return { x: a.x + dx * t, y: a.y + dy * t };
}
const restart = (el, cls) => {
  el.classList.remove(cls);
  void el.getBoundingClientRect();
  el.classList.add(cls);
};

export {
  $,
  $$,
  NS,
  reduce,
  esc,
  S,
  ease,
  tween,
  sleep,
  onResize,
  edgePt,
  restart,
};

export const canvasFont = "'Atkinson Hyperlegible', system-ui, sans-serif";

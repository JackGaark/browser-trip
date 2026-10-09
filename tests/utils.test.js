import test from "node:test";
import assert from "node:assert/strict";

globalThis.matchMedia = () => ({ matches: false });
const { esc, edgePt, ease, tween } = await import("../js/core/utils.js");

test("HTML escaping keeps user input out of generated markup", () => {
  assert.equal(
    esc('<img title="a&b">'),
    "&lt;img title=&quot;a&amp;b&quot;&gt;",
  );
});

test("diagram connections intersect horizontal and vertical box edges", () => {
  const box = { x: 100, y: 100, w: 80, h: 40 };
  assert.deepEqual(edgePt(box, { x: 200, y: 100 }), { x: 140, y: 100 });
  assert.deepEqual(edgePt(box, { x: 100, y: 0 }), { x: 100, y: 80 });
});

test("animation easing preserves endpoints and the midpoint", () => {
  assert.equal(ease(0), 0);
  assert.equal(ease(0.5), 0.5);
  assert.equal(ease(1), 1);
});

test("cancelled animations do not update detached scene state", async () => {
  globalThis.requestAnimationFrame = (callback) =>
    queueMicrotask(() => callback(performance.now()));
  let updates = 0;
  assert.equal(
    await tween(
      100,
      () => updates++,
      () => false,
    ),
    false,
  );
  assert.equal(updates, 0);
});

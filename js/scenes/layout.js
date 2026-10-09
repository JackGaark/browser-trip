import { $, $$, esc, onResize } from "../core/utils.js";

export const initLayout = ({ sound }) => {
  const vp = $("#vp"),
    vpW = $("#vpW"),
    overlay = $("#overlay"),
    vpWrap = vp.parentElement;
  let lastTick = 0;
  function measure() {
    const t0 = performance.now();
    const base = vp.getBoundingClientRect();
    const rects = $$("[data-box]", vp).map((el) => [
      el.dataset.box,
      el.getBoundingClientRect(),
    ]);
    const t1 = performance.now();
    overlay.innerHTML = $("#showBoxes").checked
      ? rects
          .map(
            ([n, r]) =>
              `<div class="ob" style="left:${(r.left - base.left).toFixed(1)}px;top:${(r.top - base.top).toFixed(1)}px;width:${r.width.toFixed(1)}px;height:${r.height.toFixed(1)}px"><span>${esc(n)} ${Math.round(r.width)}×${Math.round(r.height)}</span></div>`,
          )
          .join("")
      : "";
    $("#layStat").textContent =
      `Viewport ${Math.round(base.width)} px wide. ${rects.length} boxes measured in ${(t1 - t0).toFixed(2)} ms.`;
    $("#vpOut").textContent = Math.round(base.width) + " px";
  }
  function fitVp() {
    const max = Math.max(260, Math.floor(vpWrap.clientWidth));
    vpW.max = String(max);
    if (+vpW.value > max || !vp.style.getPropertyValue("--vpw"))
      vpW.value = String(max);
    vp.style.setProperty("--vpw", vpW.value + "px");
    requestAnimationFrame(measure);
  }
  vpW.addEventListener("input", () => {
    vp.style.setProperty("--vpw", vpW.value + "px");
    requestAnimationFrame(measure);
    const v = +vpW.value;
    if (Math.abs(v - lastTick) >= 24) {
      lastTick = v;
      sound.cue.tick(300 + v, 0, 0.03);
    }
  });
  $("#showBoxes").addEventListener("change", measure);
  onResize(vpWrap, fitVp);
  vp.addEventListener("transitionend", measure);
  fitVp();
};

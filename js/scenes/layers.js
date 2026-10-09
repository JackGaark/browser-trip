import { $, $$ } from "../core/utils.js";

export const initLayers = ({ sound }) => {
  const stack = $("#stack");
  $("#explode").addEventListener("input", (e) => {
    stack.style.setProperty("--e", (e.target.value / 100).toFixed(2));
    $("#exOut").textContent = e.target.value + "%";
  });
  const COST = {
    transform: {
      on: ["composite"],
      cls: "p-transform",
      text: "transform skips style, layout and paint entirely. The compositor just moves an already painted layer, often on the GPU, without touching the main thread. This is the cheap one.",
    },
    opacity: {
      on: ["composite"],
      cls: "p-opacity",
      text: "opacity is also compositor-only. Fading a layer means blending it differently, not redrawing it.",
    },
    color: {
      on: ["style", "paint", "composite"],
      cls: "p-color",
      text: "Changing a background color doesn’t move anything, so layout is skipped, but the box has to be repainted every frame.",
    },
    width: {
      on: ["style", "layout", "paint", "composite"],
      cls: "p-width",
      text: "Width is the expensive one. Every frame, layout re-runs (and can push neighbors around), then paint, then composite. Use transform: scale() when you can.",
    },
  };
  function setCost(k) {
    const c = COST[k],
      box = $("#demoBox");
    box.className = "demo-box " + c.cls;
    $$(".pchip").forEach((p) =>
      p.classList.toggle("on", c.on.includes(p.dataset.st)),
    );
    $("#costText").textContent = c.text;
    c.on.forEach((_, i) => sound.cue.tick(500 + i * 160, i * 0.06, 0.05));
  }
  $$('input[name="prop"]').forEach((r) =>
    r.addEventListener("change", () => setCost(r.value)),
  );
  setCost("transform");
};

import { $, $$ } from "./utils.js";

export const initProgress = () => {
  const scenes = $$("[data-ring]"),
    ring = $("#ring"),
    ringArc = $("#ringArc"),
    ringLbl = $("#ringLbl"),
    C = 81.7;
  const ringIO = new IntersectionObserver(
    (es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        const i = scenes.indexOf(e.target);
        ringLbl.textContent = e.target.dataset.ring;
        ringArc.style.strokeDashoffset = String(
          C * (1 - i / (scenes.length - 1)),
        );
        ring.classList.toggle("dark", e.target.classList.contains("blue"));
      });
    },
    { rootMargin: "-48% 0px -50% 0px" },
  );
  scenes.forEach((s) => ringIO.observe(s));
};

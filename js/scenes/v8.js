import { $, $$, tween, restart } from "../core/utils.js";

export const initV8 = ({ sound }) => {
  const TIERS = [
    {
      n: "Ignition",
      d: "interpreter: runs bytecode",
      at: 0,
      speed: 1,
      code: "; bytecode, run one instruction at a time\nLdar a1\nAdd a0, [0]\nReturn",
    },
    {
      n: "Sparkplug",
      d: "baseline compiler: fast to build",
      at: 200,
      speed: 2.5,
      code: "; the same bytecode, translated straight to\n; machine code, with no optimizations\ncall  Builtin::Add\nret",
    },
    {
      n: "Maglev",
      d: "mid-tier optimizer",
      at: 2000,
      speed: 8,
      code: "; bet: a and b are always small integers\ncheck_small_int a\ncheck_small_int b\nadd   r1, r2\njo    deopt          ; overflow? bail out\nret",
    },
    {
      n: "TurboFan",
      d: "top-tier optimizer",
      at: 15000,
      speed: 20,
      code: "; same bet, fully optimized and inlined\n; into its callers\nadd   eax, ebx\njo    deopt\nret",
    },
  ];
  let v8Calls = 0,
    v8Warm = 0,
    v8Tier = 0,
    v8Busy = 0,
    v8Poly = false;
  $("#tiers").innerHTML = TIERS.map(
    (t) => `<li><b>${t.n}</b><span>${t.d}</span></li>`,
  ).join("");
  const tierFor = (w) => TIERS.reduce((a, t, i) => (w >= t.at ? i : a), 0);
  function renderV8() {
    $("#v8Calls").textContent = Math.round(v8Calls).toLocaleString();
    $$("#tiers li").forEach((li, i) => {
      li.classList.toggle("on", i === v8Tier);
      li.classList.toggle("past", i < v8Tier);
    });
    const t = TIERS[v8Tier],
      nx = TIERS[v8Tier + 1];
    $("#v8Speed").textContent = t.speed + "×";
    $("#v8Code").textContent =
      t.code +
      (v8Poly && v8Tier >= 2
        ? "\n; now also handles strings: slower, but safe"
        : "");
    const frac = Math.log(t.speed) / Math.log(20);
    $("#needle").style.transform =
      `rotate(${(-90 + frac * 180).toFixed(1)}deg)`;
    $("#gArc").style.strokeDashoffset = String(239 * (1 - frac));
    $("#v8Heat").style.width = nx
      ? Math.min(100, ((v8Warm - t.at) / (nx.at - t.at)) * 100).toFixed(1) + "%"
      : "100%";
    $("#v8Next").textContent = nx
      ? `${Math.max(0, Math.ceil(nx.at - v8Warm)).toLocaleString()} more calls until ${nx.n}`
      : "Fully optimized.";
  }
  async function callV8(n) {
    const run = ++v8Busy,
      w0 = v8Warm,
      c0 = v8Calls;
    await tween(
      Math.min(1400, 300 + Math.log10(n) * 280),
      (e) => {
        v8Warm = w0 + n * e;
        v8Calls = c0 + n * e;
        const nt = tierFor(v8Warm);
        if (nt > v8Tier) {
          v8Tier = nt;
          sound.cue.note(["C", "E", "G", "B"][nt], 0, 0.5);
          sound.tone(220 * Math.pow(2, nt / 2), {
            dur: 0.5,
            gain: 0.05,
            slide: 1.5,
            type: "triangle",
          });
          $("#v8Msg").textContent =
            `Hot code: compiled by ${TIERS[nt].n}. It now runs about ${TIERS[nt].speed}× faster than the interpreter.`;
        }
        renderV8();
      },
      () => run === v8Busy,
    );
    renderV8();
  }
  $$("[data-calls]").forEach((b) =>
    b.addEventListener("click", () => {
      sound.cue.tick(900);
      callV8(+b.dataset.calls);
    }),
  );
  $("#v8Str").addEventListener("click", () => {
    v8Busy++;
    v8Calls += 1;
    if (v8Tier >= 2) {
      v8Tier = 0;
      v8Warm = 0;
      v8Poly = true;
      restart($("#v8Code"), "flash-bad");
      sound.cue.bad();
      sound.cue.thud(0.1);
      $("#v8Msg").textContent =
        "Deoptimized. The optimized code bet on two numbers and got a string, so V8 threw it away and fell back to the interpreter. It will warm up again, this time with code that expects both types.";
    } else {
      sound.cue.blip(500);
      $("#v8Msg").textContent =
        `${TIERS[v8Tier].n} doesn’t make type bets, so a string is fine here: add('1', 2) just returns '12'. Optimized tiers are the ones that can bail out.`;
    }
    renderV8();
  });
  $("#v8Reset").addEventListener("click", () => {
    v8Busy++;
    v8Calls = 0;
    v8Warm = 0;
    v8Tier = 0;
    v8Poly = false;
    $("#v8Msg").textContent = "Back to cold code.";
    renderV8();
  });
  renderV8();
};

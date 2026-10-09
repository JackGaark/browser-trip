import { $ } from "./utils.js";

export const createSound = () => {
  let ctx = null,
    master = null,
    on = false;
  const NOTE = {
    C: 523.25,
    D: 587.33,
    E: 659.25,
    F: 698.46,
    G: 783.99,
    A: 880,
    B: 987.77,
  };
  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try {
        ctx = new AC();
      } catch (e) {
        return false;
      }
      const comp = ctx.createDynamicsCompressor();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return true;
  }
  function tone(freq, o = {}) {
    if (!on || !ctx) return;
    const {
      dur = 0.18,
      type = "sine",
      gain = 0.1,
      at = 0,
      slide = 0,
      attack = 0.006,
    } = o;
    const t = ctx.currentTime + at + 0.01;
    const osc = ctx.createOscillator(),
      g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide)
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(30, freq * slide),
        t + dur,
      );
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
  function noise(dur = 0.3, freq = 400, gain = 0.25, at = 0) {
    if (!on || !ctx) return;
    const t = ctx.currentTime + at + 0.01;
    const buf = ctx.createBuffer(
        1,
        Math.floor(ctx.sampleRate * dur),
        ctx.sampleRate,
      ),
      d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const src = ctx.createBufferSource(),
      f = ctx.createBiquadFilter(),
      g = ctx.createGain();
    src.buffer = buf;
    f.type = "lowpass";
    f.frequency.value = freq;
    g.gain.value = gain;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t);
  }
  const cue = {
    tick: (f = 1200, at = 0, gain = 0.03) =>
      tone(f, { dur: 0.04, gain, at, type: "triangle" }),
    blip: (f = 660, at = 0) =>
      tone(f, { dur: 0.12, gain: 0.07, at, type: "triangle" }),
    note: (l, at = 0, len = 0.5) => {
      const f = NOTE[l] || 440;
      tone(f, { dur: len, gain: 0.11, at });
      tone(f * 2, { dur: len * 0.6, gain: 0.025, at });
    },
    good: (at = 0) => {
      cue.note("C", at, 0.3);
      cue.note("E", at + 0.09, 0.3);
      cue.note("G", at + 0.18, 0.5);
    },
    bad: (at = 0) => {
      tone(185, { dur: 0.35, type: "sawtooth", gain: 0.035, at });
      tone(196, { dur: 0.35, type: "sawtooth", gain: 0.035, at });
    },
    boing: (at = 0) =>
      tone(260, { dur: 0.3, gain: 0.09, slide: 2.2, at, type: "triangle" }),
    pop: (at = 0) => {
      noise(0.08, 1800, 0.15, at);
      tone(880, { dur: 0.08, gain: 0.04, at, slide: 0.5 });
    },
    thud: (at = 0) => {
      noise(0.35, 180, 0.5, at);
      tone(60, { dur: 0.4, gain: 0.25, at, slide: 0.6 });
    },
  };
  return {
    get on() {
      return on;
    },
    toggle() {
      if (!ensure()) return null;
      on = !on;
      if (on) cue.good();
      return on;
    },
    tone,
    cue,
  };
};

export const initSoundButton = (sound) => {
  const sBtn = $("#soundBtn");
  sBtn.addEventListener("click", () => {
    const r = sound.toggle();
    if (r === null) {
      $(".stxt", sBtn).textContent = "Sound unavailable";
      sBtn.disabled = true;
      return;
    }
    sBtn.setAttribute("aria-pressed", String(r));
    $(".stxt", sBtn).textContent = r ? "Sound on" : "Sound off";
  });
};

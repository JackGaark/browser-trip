import { $, $$, sleep, restart } from "../core/utils.js";

export const initOutro = ({ sound }) => {
  let tripRun = 0;
  $("#tripGo").addEventListener("click", async () => {
    const run = ++tripRun,
      links = $$("#trip a"),
      notes = ["C", "D", "E", "F", "G", "A", "B", "C", "D", "E", "F", "G", "A"];
    links.forEach((a) => a.classList.remove("lit"));
    const pip = $("#outroPip");
    for (let i = 0; i < links.length; i++) {
      if (run !== tripRun) return;
      links[i].classList.add("lit");
      restart(pip, "hop");
      pip.classList.add("pip-g");
      sound.tone(
        (i > 6 ? 2 : 1) *
          { C: 261.6, D: 293.7, E: 329.6, F: 349.2, G: 392, A: 440, B: 493.9 }[
            notes[i]
          ],
        { dur: 0.3, gain: 0.09, type: "triangle" },
      );
      await sleep(240);
    }
    sound.cue.good(0.1);
  });
};

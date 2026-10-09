import symbolsMarkup from "../svg/symbols.svg?raw";
import progressRingMarkup from "../svg/progress-ring.svg?raw";
import soundIconMarkup from "../svg/sound-icon.svg?raw";
import heroMarkup from "../svg/hero.svg?raw";
import urlPipMarkup from "../svg/url-pip.svg?raw";
import speedGaugeMarkup from "../svg/speed-gauge.svg?raw";
import outroPipMarkup from "../svg/outro-pip.svg?raw";

const assets = [
  ["symbols", symbolsMarkup],
  ["progress-ring", progressRingMarkup],
  ["sound-icon", soundIconMarkup],
  ["hero", heroMarkup],
  ["url-pip", urlPipMarkup],
  ["speed-gauge", speedGaugeMarkup],
  ["outro-pip", outroPipMarkup],
];

export const loadSvgAssets = () => {
  // Keep SVG nodes in the document for CSS, shared symbols, and animation hooks.
  for (const [name, markup] of assets) {
    const placeholder = document.querySelector(`[data-svg="${name}"]`);
    if (!placeholder) throw new Error(`Missing SVG placeholder: ${name}`);
    placeholder.outerHTML = markup;
  }

  // Initialize only after every SVG and its IDs are present.
};

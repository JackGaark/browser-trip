import chromeMarkup from "../html/chrome.html?raw";
import heroMarkup from "../html/hero.html?raw";
import urlMarkup from "../html/url.html?raw";
import dnsMarkup from "../html/dns.html?raw";
import hsMarkup from "../html/handshake.html?raw";
import httpMarkup from "../html/http.html?raw";
import domMarkup from "../html/dom.html?raw";
import scriptsMarkup from "../html/scripts.html?raw";
import layoutMarkup from "../html/layout.html?raw";
import paintMarkup from "../html/paint.html?raw";
import layersMarkup from "../html/layers.html?raw";
import rasterMarkup from "../html/raster.html?raw";
import v8Markup from "../html/v8.html?raw";
import gcMarkup from "../html/garbage-collection.html?raw";
import procMarkup from "../html/processes.html?raw";
import endMarkup from "../html/outro.html?raw";

const sections = [
  ["chrome", chromeMarkup],
  ["hero", heroMarkup],
  ["url", urlMarkup],
  ["dns", dnsMarkup],
  ["hs", hsMarkup],
  ["http", httpMarkup],
  ["dom", domMarkup],
  ["scripts", scriptsMarkup],
  ["layout", layoutMarkup],
  ["paint", paintMarkup],
  ["layers", layersMarkup],
  ["raster", rasterMarkup],
  ["v8", v8Markup],
  ["gc", gcMarkup],
  ["proc", procMarkup],
  ["end", endMarkup],
];

export const loadHtmlSections = () => {
  // Assemble the page before SVG hydration and application initialization.
  for (const [name, markup] of sections) {
    const placeholder = document.querySelector(`template[data-html="${name}"]`);
    if (!placeholder) throw new Error(`Missing HTML section: ${name}`);
    placeholder.outerHTML = markup;
  }
};

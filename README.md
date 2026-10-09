# Inside the Browser

Run `pnpm install`, then `pnpm dev` and open the root URL printed by Vite (for example, `http://localhost:5174/`).
Use `pnpm build` for production and `pnpm preview` to serve the build.

- `index.html`: page shell and section placeholders.
- `html/`: page sections.
- `svg/`: SVG assets.
- `css/components/`: styles grouped by shared component or scene; `css/browser-trip.css` controls cascade order.
- `js/main.js`: assembles HTML, hydrates SVGs, then initializes the app.
- `js/core/`: shared DOM, motion, sound and progress helpers.
- `js/scenes/`: one initializer per interactive scene, with local state.

Vite imports HTML and SVG files as raw markup. Serve through Vite rather than opening the HTML directly. URL and DNS share hostname state through explicit initializer parameters.

Run `pnpm test` for shared utility regression tests.

`browser-trip.html` redirects to the root page for existing bookmarks.

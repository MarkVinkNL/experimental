# Canvas Experiments

A collection of interactive canvas demos including metaballs, grid animations, bounce physics, and more — hosted on GitHub Pages.

[Preview](https://markvinknl.github.io/experimental/)

## Structure

Each demo lives in its own folder containing an `index.html`:

```
canvas/
  bounce/       — Bouncing circle physics demos
  grid/         — Grid-based animations
  inspiration/  — Experimental / exploratory demos
  liquid/       — Liquid/metaball effects
  matterjs/     — Matter.js physics
  metaballs/    — Metaball simulations
confetti/
health/
```

## GitHub Pages

The root `index.html` (the page index) is **auto-generated** by a GitHub Actions workflow on every push — it is never committed to the repo. GitHub Pages is served directly from the Actions deployment.

> **First-time setup:** Go to **Settings → Pages → Source** and set it to **GitHub Actions**.

## Local Development

No dependencies to install — everything runs in the browser with vanilla JS.

To preview the generated page index locally:

```bash
npm run generate
```

This writes a root `index.html` you can open in your browser. It is gitignored and will not be committed.

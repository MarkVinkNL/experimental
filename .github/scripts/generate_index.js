/**
 * Scans the repository for all index.html files and generates a root index.html
 * that links to each one, grouped by top-level directory.
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "../..");
const OUTPUT_FILE = path.join(REPO_ROOT, "index.html");
const SKIP_DIRS = new Set([".git", ".github", "node_modules"]);

function findIndexFiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        findIndexFiles(path.join(dir, entry.name), results);
      }
    } else if (entry.name === "index.html") {
      const abs = path.join(dir, entry.name);
      const rel = path.relative(REPO_ROOT, abs).replace(/\\/g, "/");
      // Skip the root index.html we're generating
      if (rel !== "index.html") {
        results.push(rel);
      }
    }
  }
  return results;
}

function groupBySection(paths) {
  const groups = {};
  for (const p of paths) {
    const section = p.split("/")[0];
    (groups[section] ??= []).push(p);
  }
  return Object.fromEntries(Object.entries(groups).sort());
}

function makeLabel(p) {
  const dirs = p.split("/").slice(0, -1); // drop index.html
  return dirs.length === 1 ? dirs[0] : dirs.slice(1).join(" / ");
}

function generateHtml(groups) {
  const sectionsHtml = Object.entries(groups)
    .map(([section, paths]) => {
      const items = paths.map((p) => `      <li><a href="${p}">${makeLabel(p)}</a></li>`).join("\n");
      return `  <section>\n    <h2>${section}</h2>\n    <ul>\n${items}\n    </ul>\n  </section>`;
    })
    .join("\n\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Project Index</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: system-ui, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
      background: #0d1117;
      color: #c9d1d9;
    }
    h1 {
      font-size: 1.8rem;
      margin-bottom: 0.25rem;
      color: #e6edf3;
    }
    p.subtitle {
      color: #8b949e;
      margin-top: 0;
      margin-bottom: 2rem;
      font-size: 0.95rem;
    }
    section { margin-bottom: 2rem; }
    h2 {
      font-size: 1.1rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #58a6ff;
      border-bottom: 1px solid #21262d;
      padding-bottom: 0.4rem;
      margin-bottom: 0.75rem;
    }
    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    li a {
      display: inline-block;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      background: #161b22;
      border: 1px solid #30363d;
      color: #c9d1d9;
      text-decoration: none;
      font-size: 0.9rem;
      transition: border-color 0.15s, color 0.15s;
    }
    li a:hover {
      border-color: #58a6ff;
      color: #58a6ff;
    }
  </style>
</head>
<body>
  <h1>Project Index</h1>
  <p class="subtitle">Auto-generated index of all demos in this repository.</p>

${sectionsHtml}
</body>
</html>
`;
}

const paths = findIndexFiles(REPO_ROOT).sort();
const groups = groupBySection(paths);
const html = generateHtml(groups);
fs.writeFileSync(OUTPUT_FILE, html, "utf-8");
console.log(`Written ${paths.length} links to ${OUTPUT_FILE}`);

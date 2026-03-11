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

function buildTree(paths) {
  // tree: { [top]: { [sub]: [{href, label}] } }
  const tree = {};
  for (const p of paths) {
    const dirs = p.split("/").slice(0, -1); // drop index.html
    const top = dirs[0];
    // middle folders between top and the last folder become the subcategory
    const sub = dirs.length > 2 ? dirs.slice(1, -1).join(" / ") : "";
    const label = dirs[dirs.length - 1];
    ((tree[top] ??= {})[sub] ??= []).push({ href: p, label });
  }
  // Sort top-level and sub-level keys
  return Object.fromEntries(
    Object.entries(tree)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([top, subs]) => [top, Object.fromEntries(Object.entries(subs).sort(([a], [b]) => a.localeCompare(b)))]),
  );
}

function generateHtml(tree) {
  const sectionsHtml = Object.entries(tree)
    .map(([top, subs]) => {
      const subsHtml = Object.entries(subs)
        .map(([sub, links]) => {
          const items = links.map(({ href, label }) => `        <li><a href="${href}">${label}</a></li>`).join("\n");
          const header = sub ? `      <h3>${sub}</h3>\n` : "";
          return `${header}      <ul>\n${items}\n      </ul>`;
        })
        .join("\n\n");
      return `  <section>\n    <h2>${top}</h2>\n${subsHtml}\n  </section>`;
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
    h3 {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #8b949e;
      margin: 1rem 0 0.4rem;
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
const tree = buildTree(paths);
const html = generateHtml(tree);
fs.writeFileSync(OUTPUT_FILE, html, "utf-8");
console.log(`Written ${paths.length} links to ${OUTPUT_FILE}`);

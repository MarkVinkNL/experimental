/**
 * Scans the repository for all index.html files and generates a root index.html
 * that links to each one, grouped by top-level directory.
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "../..");
const OUTPUT_FILE = path.join(REPO_ROOT, "index.html");
const STUB_FILE = path.join(__dirname, "../stubs/index.html");
const BACK_BUTTON_PARTIAL = path.join(__dirname, "../stubs/back-button.html");
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

function cleanName(name) {
  // Remove leading "number." prefix, e.g. "0.work" → "work", "3.animate_open" → "animate_open"
  return name.replace(/^\d+\./, "").replace(/_/g, " ");
}

function buildTree(paths) {
  // tree: { [top]: { [sub]: [{href, label}] } }
  const tree = {};
  for (const p of paths) {
    const dirs = p.split("/").slice(0, -1); // drop index.html
    const top = dirs[0];
    // middle folders between top and the last folder become the subcategory
    const sub = dirs.length > 2 ? dirs.slice(1, -1).map(cleanName).join(" / ") : "";
    const label = cleanName(dirs[dirs.length - 1]);
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

  const stub = fs.readFileSync(STUB_FILE, "utf-8");
  return stub.replace("  <!-- GENERATED_CONTENT -->", sectionsHtml);
}

function injectBackButtonPartial(indexPaths) {
  // Only inject when explicitly enabled from the workflow
  if (process.env.GH_WORKFLOW_BACK_BUTTON !== "1") {
    return;
  }

  const partial = fs.readFileSync(BACK_BUTTON_PARTIAL, "utf-8");

  for (const rel of indexPaths) {
    const abs = path.join(REPO_ROOT, rel);
    let contents = fs.readFileSync(abs, "utf-8");

    // Avoid duplicate injection if already present
    if (contents.includes("data-back-button-partial")) {
      continue;
    }

    let inserted = false;
    const bodyClose = contents.lastIndexOf("</body>");
    if (bodyClose !== -1) {
      contents =
        contents.slice(0, bodyClose) + partial + "\n" + contents.slice(bodyClose);
      inserted = true;
    } else {
      const htmlClose = contents.lastIndexOf("</html>");
      if (htmlClose !== -1) {
        contents =
          contents.slice(0, htmlClose) + partial + "\n" + contents.slice(htmlClose);
        inserted = true;
      }
    }

    if (inserted) {
      fs.writeFileSync(abs, contents, "utf-8");
    }
  }
}

const paths = findIndexFiles(REPO_ROOT).sort();
const tree = buildTree(paths);
const html = generateHtml(tree);
fs.writeFileSync(OUTPUT_FILE, html, "utf-8");
console.log(`Written ${paths.length} links to ${OUTPUT_FILE}`);

// Inject back button into all index.html files except the root one
injectBackButtonPartial(paths);

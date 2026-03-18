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

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeHref(href) {
  const h = String(href ?? "").trim();
  if (!h) return "";
  if (h.startsWith("/") || h.startsWith("./") || h.startsWith("../") || h.startsWith("#")) return h;
  if (/^https?:\/\//i.test(h)) return h;
  return "";
}

function applyInlineMarkdown(text) {
  // Work on an already-escaped string. We only inject safe tags.
  let s = escapeHtml(text);

  // Inline code
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Links: [text](href)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => {
    const safeHref = sanitizeHref(href);
    const safeLabel = escapeHtml(label);
    if (!safeHref) return safeLabel;
    const escapedHref = escapeHtml(safeHref);
    return `<a href="${escapedHref}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
  });

  // Bold / italic (simple)
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  return s;
}

function markdownToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  const isBlank = (l) => l.trim().length === 0;
  const isBullet = (l) => /^\s*[-*]\s+/.test(l);
  const headingMatch = (l) => l.match(/^(#{1,3})\s+(.+?)\s*$/);

  while (i < lines.length) {
    while (i < lines.length && isBlank(lines[i])) i++;
    if (i >= lines.length) break;

    const hm = headingMatch(lines[i]);
    if (hm) {
      const level = hm[1].length; // 1..3
      const content = applyInlineMarkdown(hm[2]);
      blocks.push(`<h${level + 3} class="md-heading">${content}</h${level + 3}>`);
      i++;
      continue;
    }

    if (isBullet(lines[i])) {
      const items = [];
      while (i < lines.length && isBullet(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        `<ul class="md-list">${items.map((it) => `<li>${applyInlineMarkdown(it)}</li>`).join("")}</ul>`,
      );
      continue;
    }

    const para = [];
    while (
      i < lines.length &&
      !isBlank(lines[i]) &&
      !isBullet(lines[i]) &&
      !headingMatch(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      `<p class="md-paragraph">${applyInlineMarkdown(para.join("\n")).replace(/\n/g, "<br>")}</p>`,
    );
  }

  return blocks.join("\n");
}

function isCategoryDir(absDir) {
  let entries;
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    return false;
  }

  const relevant = entries.filter((e) => e.name !== "info.md" && !SKIP_DIRS.has(e.name));
  if (relevant.length === 0) return false;
  return relevant.every((e) => e.isDirectory());
}

const infoCache = new Map();
function getCategoryInfoHtml(relDir) {
  const absDir = path.join(REPO_ROOT, relDir);
  if (infoCache.has(absDir)) return infoCache.get(absDir);

  if (!isCategoryDir(absDir)) {
    infoCache.set(absDir, "");
    return "";
  }

  const infoPath = path.join(absDir, "info.md");
  if (!fs.existsSync(infoPath)) {
    infoCache.set(absDir, "");
    return "";
  }

  const md = fs.readFileSync(infoPath, "utf-8").trim();
  if (!md) {
    infoCache.set(absDir, "");
    return "";
  }

  const html = markdownToHtml(md);
  const wrapped = `<div class="category-info">${html}</div>`;
  infoCache.set(absDir, wrapped);
  return wrapped;
}

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
  // tree: { [top]: { infoHtml: string, subs: { [sub]: { infoHtml: string, links: [{href, label}] } } } }
  const tree = {};
  for (const p of paths) {
    const dirs = p.split("/").slice(0, -1); // drop index.html
    const top = dirs[0];
    // middle folders between top and the last folder become the subcategory
    const rawSubParts = dirs.length > 2 ? dirs.slice(1, -1) : [];
    const sub = rawSubParts.length ? rawSubParts.map(cleanName).join(" / ") : "";
    const label = cleanName(dirs[dirs.length - 1]);

    const topEntry = (tree[top] ??= { infoHtml: getCategoryInfoHtml(top), subs: {} });
    const subEntry =
      (topEntry.subs[sub] ??=
        sub
          ? { infoHtml: getCategoryInfoHtml([top, ...rawSubParts].join("/")), links: [] }
          : { infoHtml: "", links: [] });
    subEntry.links.push({ href: p, label });
  }
  // Sort top-level and sub-level keys
  return Object.fromEntries(
    Object.entries(tree)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([top, topEntry]) => [
        top,
        {
          infoHtml: topEntry.infoHtml,
          subs: Object.fromEntries(
            Object.entries(topEntry.subs).sort(([a], [b]) => a.localeCompare(b)),
          ),
        },
      ]),
  );
}

function generateHtml(tree) {
  const sectionsHtml = Object.entries(tree)
    .map(([top, topEntry]) => {
      const topInfo = topEntry.infoHtml ? `    ${topEntry.infoHtml}\n` : "";

      const subsHtml = Object.entries(topEntry.subs)
        .map(([sub, subEntry]) => {
          const items = subEntry.links
            .map(({ href, label }) => `        <li><a href="${href}">${label}</a></li>`)
            .join("\n");
          const header = sub ? `      <h3>${sub}</h3>\n` : "";
          const info = sub && subEntry.infoHtml ? `      ${subEntry.infoHtml}\n` : "";
          return `${header}${info}      <ul>\n${items}\n      </ul>`;
        })
        .join("\n\n");
      return `  <section>\n    <h2>${top}</h2>\n${topInfo}${subsHtml}\n  </section>`;
    })
    .join("\n\n");

  const stub = fs.readFileSync(STUB_FILE, "utf-8");
  const styleInject = `
      <style>
        h2 {
          font-size: 1.05rem;
        }

        h3 {
          font-size: 1.08rem;
        }

        .category-info {
          margin: 0.35rem 0 0.9rem;
          line-height: 1.35;
        }

        h2 + .category-info {
          color: #58a6ff;
          font-size: 0.75em;
        }

        h3 + .category-info {
          color: #6b7280;
          font-size: 0.75em;
        }

        .category-info .md-paragraph {
          margin: 0.35rem 0;
        }

        .category-info .md-heading {
          margin: 0.35rem 0;
          font-size: 1em;
          font-weight: 600;
          letter-spacing: normal;
          text-transform: none;
        }

        .category-info code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
            "Courier New", monospace;
          font-size: 0.95em;
          padding: 0.05em 0.35em;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.05);
        }

        .category-info a {
          color: inherit;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .category-info .md-list {
          margin: 0.35rem 0;
          padding-left: 1.25rem;
          list-style: disc;
        }

        .category-info .md-list li {
          margin: 0.15rem 0;
        }
      </style>
`;

  const withStyle = stub.includes("</style>")
    ? stub.replace("</style>", `</style>${styleInject}`)
    : stub;

  return withStyle.replace("  <!-- GENERATED_CONTENT -->", sectionsHtml);
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

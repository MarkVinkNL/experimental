const fs = require("fs");
const path = require("path");

const { markdownToHtml } = require("./markdown");

function isCategoryDir(absDir, { skipDirs }) {
  let entries;
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    return false;
  }

  const relevant = entries.filter((e) => e.name !== "info.md" && !skipDirs.has(e.name));
  if (relevant.length === 0) return false;
  return relevant.every((e) => e.isDirectory());
}

function createCategoryInfoReader({ repoRoot, skipDirs }) {
  const infoCache = new Map();

  return function getCategoryInfoHtml(relDir) {
    const absDir = path.join(repoRoot, relDir);
    if (infoCache.has(absDir)) return infoCache.get(absDir);

    if (!isCategoryDir(absDir, { skipDirs })) {
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
  };
}

module.exports = { createCategoryInfoReader };

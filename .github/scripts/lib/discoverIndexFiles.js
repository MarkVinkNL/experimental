const fs = require("fs");
const path = require("path");

function discoverIndexFiles({ repoRoot, skipDirs }) {
  const results = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) {
          walk(path.join(dir, entry.name));
        }
        continue;
      }

      if (entry.name === "index.html") {
        const abs = path.join(dir, entry.name);
        const rel = path.relative(repoRoot, abs).replace(/\\/g, "/");
        // Skip the root index.html we're generating
        if (rel !== "index.html") {
          results.push(rel);
        }
      }
    }
  }

  walk(repoRoot);
  return results;
}

module.exports = { discoverIndexFiles };

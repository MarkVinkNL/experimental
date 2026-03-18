const fs = require("fs");
const path = require("path");

function maybeInjectBackButton(indexPaths, { repoRoot, partialPath, enabled }) {
  if (!enabled) {
    return;
  }

  const partial = fs.readFileSync(partialPath, "utf-8");

  for (const rel of indexPaths) {
    const abs = path.join(repoRoot, rel);
    let contents = fs.readFileSync(abs, "utf-8");

    // Avoid duplicate injection if already present
    if (contents.includes("data-back-button-partial")) {
      continue;
    }

    let inserted = false;
    const bodyClose = contents.lastIndexOf("</body>");
    if (bodyClose !== -1) {
      contents = contents.slice(0, bodyClose) + partial + "\n" + contents.slice(bodyClose);
      inserted = true;
    } else {
      const htmlClose = contents.lastIndexOf("</html>");
      if (htmlClose !== -1) {
        contents = contents.slice(0, htmlClose) + partial + "\n" + contents.slice(htmlClose);
        inserted = true;
      }
    }

    if (inserted) {
      fs.writeFileSync(abs, contents, "utf-8");
    }
  }
}

module.exports = { maybeInjectBackButton };

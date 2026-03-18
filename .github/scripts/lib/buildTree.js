function cleanName(name) {
  // Remove leading "number." prefix, e.g. "0.work" → "work", "3.animate_open" → "animate_open"
  return name.replace(/^\d+\./, "").replace(/_/g, " ");
}

function buildTree(paths, { getCategoryInfoHtml }) {
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
          subs: Object.fromEntries(Object.entries(topEntry.subs).sort(([a], [b]) => a.localeCompare(b))),
        },
      ]),
  );
}

module.exports = { buildTree };

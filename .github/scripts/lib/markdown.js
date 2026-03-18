function escapeHtml(text) {
  return String(text)
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
  const lines = String(md).replace(/\r\n/g, "\n").split("\n");
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
    while (i < lines.length && !isBlank(lines[i]) && !isBullet(lines[i]) && !headingMatch(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(`<p class="md-paragraph">${applyInlineMarkdown(para.join("\n")).replace(/\n/g, "<br>")}</p>`);
  }

  return blocks.join("\n");
}

module.exports = { markdownToHtml };

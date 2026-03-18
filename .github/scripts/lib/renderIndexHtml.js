const fs = require("fs");

const STYLE_INJECT = `
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

function injectStyleIntoStub(stubHtml, styleBlock) {
  return stubHtml.includes("</style>") ? stubHtml.replace("</style>", `</style>${styleBlock}`) : stubHtml;
}

function renderSubSection(sub, subEntry) {
  const items = subEntry.links
    .map(({ href, label }) => `        <li><a href="${href}">${label}</a></li>`)
    .join("\n");
  const header = sub ? `      <h3>${sub}</h3>\n` : "";
  const info = sub && subEntry.infoHtml ? `      ${subEntry.infoHtml}\n` : "";
  return `${header}${info}      <ul>\n${items}\n      </ul>`;
}

function renderSection(top, topEntry) {
  const topInfo = topEntry.infoHtml ? `    ${topEntry.infoHtml}\n` : "";
  const subsHtml = Object.entries(topEntry.subs)
    .map(([sub, subEntry]) => renderSubSection(sub, subEntry))
    .join("\n\n");
  return `  <section>\n    <h2>${top}</h2>\n${topInfo}${subsHtml}\n  </section>`;
}

function renderIndexHtml(tree, { stubPath }) {
  const sectionsHtml = Object.entries(tree)
    .map(([top, topEntry]) => renderSection(top, topEntry))
    .join("\n\n");

  const stub = fs.readFileSync(stubPath, "utf-8");
  const withStyle = injectStyleIntoStub(stub, STYLE_INJECT);

  return withStyle.replace("  <!-- GENERATED_CONTENT -->", sectionsHtml);
}

module.exports = { renderIndexHtml };

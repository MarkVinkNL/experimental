/**
 * Scans the repository for all index.html files and generates a root index.html
 * that links to each one, grouped by top-level directory.
 */

const fs = require("fs");
const path = require("path");

const { discoverIndexFiles } = require("./lib/discoverIndexFiles");
const { createCategoryInfoReader } = require("./lib/categoryInfo");
const { buildTree } = require("./lib/buildTree");
const { renderIndexHtml } = require("./lib/renderIndexHtml");
const { maybeInjectBackButton } = require("./lib/injectBackButton");

const REPO_ROOT = path.resolve(__dirname, "../..");
const OUTPUT_FILE = path.join(REPO_ROOT, "index.html");
const STUB_FILE = path.join(__dirname, "../stubs/index.html");
const BACK_BUTTON_PARTIAL = path.join(__dirname, "../stubs/back-button.html");
const SKIP_DIRS = new Set([".git", ".github", "node_modules"]);

const paths = discoverIndexFiles({ repoRoot: REPO_ROOT, skipDirs: SKIP_DIRS }).sort();
const getCategoryInfoHtml = createCategoryInfoReader({ repoRoot: REPO_ROOT, skipDirs: SKIP_DIRS });
const tree = buildTree(paths, { getCategoryInfoHtml });
const html = renderIndexHtml(tree, { stubPath: STUB_FILE });
fs.writeFileSync(OUTPUT_FILE, html, "utf-8");
console.log(`Written ${paths.length} links to ${OUTPUT_FILE}`);

// Inject back button into all index.html files except the root one
maybeInjectBackButton(paths, {
  repoRoot: REPO_ROOT,
  partialPath: BACK_BUTTON_PARTIAL,
  enabled: process.env.GH_WORKFLOW_BACK_BUTTON === "1",
});

#!/usr/bin/env node
/**
 * Build output check for the al-folio plugin-tag seam.
 *
 * al-folio silently renders empty strings where a plugin tag (bibliography,
 * search index, ...) was expected but produced nothing. This script scans the
 * production build output and fails when:
 *   1. any page contains Liquid error text or unrendered template syntax;
 *   2. a plugin-driven surface that must have content is empty (al_search
 *      inlines its index as a ninja.data block on pages with a search toggle).
 *
 * Later tickets add more assertions to this harness (test/assert_site.js).
 */
const fs = require("fs");
const path = require("path");
const walk = require("./lib/walk");

const SITE = path.join(__dirname, "..", "_site");

let failures = [];

const htmlFiles = walk(SITE, ".html");
if (htmlFiles.length === 0) {
  console.error(`No HTML files found under ${SITE} — did the build run?`);
  process.exit(1);
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const rel = path.relative(SITE, file);

  if (/Liquid (error|syntax error|warning)/i.test(html)) {
    failures.push(`${rel}: contains Liquid error text`);
  }
  // Unrendered template syntax means a tag/include never produced output.
  if (/\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}/.test(html)) {
    failures.push(`${rel}: contains unrendered Liquid template syntax`);
  }
  // Plugin-driven surfaces that must not be empty. al_search inlines its
  // index into every page as a ninja.data script block; a page with a
  // search toggle but no data means the plugin tag silently rendered nothing.
  if (html.includes('id="search-toggle"') && !html.includes("ninja.data = [")) {
    failures.push(`${rel}: search toggle present but search index is empty`);
  }
}

if (failures.length > 0) {
  console.error("Build output check FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`Build output check passed (${htmlFiles.length} HTML pages, no empty plugin-tag output).`);

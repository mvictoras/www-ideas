#!/usr/bin/env node
/**
 * HTML assertions over the production build output (_site).
 *
 * Covers the site-shell acceptance criteria: nav pages exist and resolve
 * under the base path, IDEAS title/wordmark, search + dark-mode toggles,
 * ASCR footer with both funder logos, no email/mailto, no analytics, and
 * no removed al-folio features in nav or output.
 */
const fs = require("fs");
const path = require("path");

const SITE = path.join(__dirname, "..", "_site");
const BASEURL = "/www-ideas";

const NAV_PAGES = [
  "index.html",
  "research/index.html",
  "use-cases/index.html",
  "team/index.html",
  "publications/index.html",
  "software/index.html",
  "news/index.html",
  "events/index.html",
];

const NAV_LINKS = ["/", "/research/", "/use-cases/", "/team/", "/publications/", "/software/", "/news/", "/events/"].map((p) => `${BASEURL}${p}`);

let failures = [];
const fail = (msg) => failures.push(msg);

function walk(dir, ext, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, ext, acc);
    else if (p.endsWith(ext)) acc.push(p);
  }
  return acc;
}

const htmlFiles = walk(SITE, ".html");
if (htmlFiles.length === 0) {
  console.error(`No HTML files under ${SITE}`);
  process.exit(1);
}

// 1. Every nav page exists.
for (const p of NAV_PAGES) {
  if (!fs.existsSync(path.join(SITE, p))) fail(`missing page: ${p}`);
}

// 2. Per-page checks: navbar, wordmark, toggles, footer, no email/analytics.
// Email-like addresses; `(?![\d.])` skips npm package versions in CDN URLs
// (e.g. fontawesome-free@7.2.0), which are not personal data.
const EMAIL_RE = /[A-Za-z0-9._%+-]+@(?![\d.])[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+/;
const ANALYTICS_SNIPPETS = [
  "google-analytics.com",
  "googletagmanager.com",
  "cloudflareinsights.com",
  "simpleanalytics",
  "pirsch",
  "cronitor",
  "openpanel",
];
const REMOVED_FEATURES = ["/blog/", "/cv/", "/teaching/", "/books/", "giscus", "disqus"];

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const rel = path.relative(SITE, file);

  if (!/<title>[^<]*IDEAS/.test(html)) fail(`${rel}: <title> does not mention IDEAS`);
  if (!html.includes(`href="${BASEURL}/"`) || !html.includes('id="navbar"')) {
    fail(`${rel}: navbar missing or does not link home`);
  }
  for (const link of NAV_LINKS) {
    if (!html.includes(`href="${link}"`)) fail(`${rel}: navbar missing link ${link}`);
  }
  if (!html.includes('id="search-toggle"')) fail(`${rel}: search toggle missing`);
  if (!html.includes('id="light-toggle"')) fail(`${rel}: light/dark toggle missing`);
  if (!html.includes("DE-AC02-06CH11357")) fail(`${rel}: ASCR contract missing from footer`);
  if (!html.includes("Office of Science")) fail(`${rel}: Office of Science acknowledgment missing`);
  if (!html.includes("assets/img/logos/argonne.svg")) fail(`${rel}: Argonne logo missing`);
  if (!html.includes("assets/img/logos/doe-office-of-science.svg")) {
    fail(`${rel}: DOE Office of Science logo missing`);
  }
  if (/mailto:/i.test(html)) fail(`${rel}: contains a mailto: link`);
  if (EMAIL_RE.test(html)) fail(`${rel}: contains an email address`);

  for (const snippet of ANALYTICS_SNIPPETS) {
    if (html.includes(snippet)) fail(`${rel}: contains analytics reference "${snippet}"`);
  }
  for (const snippet of REMOVED_FEATURES) {
    if (html.includes(snippet)) fail(`${rel}: references removed feature "${snippet}"`);
  }
}

// 3. Sitemap uses the base path.
const sitemapPath = path.join(SITE, "sitemap.xml");
if (fs.existsSync(sitemapPath)) {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  if (!sitemap.includes("https://mvictoras.github.io/www-ideas/")) {
    fail("sitemap.xml: does not use the /www-ideas base path");
  }
} else {
  fail("missing sitemap.xml");
}

if (failures.length > 0) {
  console.error(`Site assertions FAILED (${failures.length}):`);
  for (const f of [...new Set(failures)]) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`Site assertions passed over ${htmlFiles.length} pages.`);

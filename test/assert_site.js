#!/usr/bin/env node
/**
 * Page and privacy assertions over the production build output (_site).
 *
 * Covers the site-shell acceptance criteria (nav pages, IDEAS title/wordmark,
 * search + dark-mode toggles, ASCR footer with both funder logos, no
 * email/mailto, no analytics, no removed al-folio features) and the Team-page
 * acceptance criteria (grid matches _data/team.yml 1:1).
 */
const fs = require("fs");
const path = require("path");
const walk = require("./lib/walk");
const yaml = require("js-yaml");

const SITE = path.join(__dirname, "..", "_site");

// The base path lives only in _config.yml (single source of truth per the
// spec); the harness reads it from there instead of hardcoding it.
const BASEURL = /^baseurl:\s*(\S*)/m.exec(fs.readFileSync(path.join(__dirname, "..", "_config.yml"), "utf8"))[1];

// One list drives both checks: the built page path and the navbar link.
const NAV_PATHS = ["/", "/research/", "/use-cases/", "/team/", "/publications/", "/software/", "/news/", "/events/"];
const NAV_PAGES = NAV_PATHS.map((p) => (p === "/" ? "index.html" : `${p}index.html`));
const NAV_LINKS = NAV_PATHS.map((p) => `${BASEURL}${p}`);

let failures = [];
const fail = (msg) => failures.push(msg);

const htmlFiles = walk(SITE, ".html");
if (htmlFiles.length === 0) {
  console.error(`No HTML files under ${SITE}`);
  process.exit(1);
}

// 1. Every nav page exists and has one primary heading.
for (const p of NAV_PAGES) {
  const file = path.join(SITE, p);
  if (!fs.existsSync(file)) {
    fail(`missing page: ${p}`);
    continue;
  }
  const html = fs.readFileSync(file, "utf8");
  const headings = html.match(/<h1(?:\s|>)/gi) || [];
  if (headings.length !== 1) fail(`${p}: expected one primary heading, found ${headings.length}`);
}

// 2. Privacy applies to all published text, including assets and search data.
// Email-like addresses. The domain must end in an alphabetic TLD (>= 2
// letters), which skips npm package versions in CDN URLs (e.g.
// fontawesome-free@7.2.0) while still matching real addresses.
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;
const decoder = new TextDecoder("utf-8", { fatal: true });
for (const file of walk(SITE, "")) {
  let content;
  try {
    content = decoder.decode(fs.readFileSync(file));
  } catch (error) {
    if (error.code === "ERR_ENCODING_INVALID_ENCODED_DATA") continue;
    throw error;
  }
  const rel = path.relative(SITE, file).split(path.sep).join("/");
  // Preserve this exact upstream copyright line; no other addresses in this
  // dependency are exempt. See docs/privacy.md and issue #13.
  if (rel === "assets/al_search/js/search/hotkeys-js/hotkeys.esm.min.js") {
    content = content.replace(/^ \* Copyright \(c\) 2024 kenny wong <wowohoo@qq\.com>\r?$/m, "");
  }
  if (/mailto:/i.test(content)) fail(`${rel}: contains a mailto: link`);
  if (EMAIL_RE.test(content)) fail(`${rel}: contains an email address`);
}

// 3. Per-page checks: navbar, wordmark, toggles, footer and no analytics.
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
  for (const snippet of ANALYTICS_SNIPPETS) {
    if (html.includes(snippet)) fail(`${rel}: contains analytics reference "${snippet}"`);
  }
  for (const snippet of REMOVED_FEATURES) {
    if (html.includes(snippet)) fail(`${rel}: references removed feature "${snippet}"`);
  }
}

// 4. Sitemap uses the configured site URL and base path.
const SITE_URL = /^url:\s*(\S*)/m.exec(fs.readFileSync(path.join(__dirname, "..", "_config.yml"), "utf8"))[1];
const sitemapPath = path.join(SITE, "sitemap.xml");
if (fs.existsSync(sitemapPath)) {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  if (!sitemap.includes(`${SITE_URL}${BASEURL}/`)) {
    fail(`sitemap.xml: does not use ${SITE_URL}${BASEURL}/ as its base path`);
  }
} else {
  fail("missing sitemap.xml");
}

// 5. The Team grid renders exactly the members in _data/team.yml, 1:1, in a
// single grid with no institution-type group headings. Cards expose their
// data through data-* attributes written by _layouts/team.liquid.
const TEAM_PAGE = path.join(SITE, "team", "index.html");
if (!fs.existsSync(TEAM_PAGE)) {
  fail("team/index.html: missing — the Team page did not build");
} else {
  const team = yaml.load(fs.readFileSync(path.join(__dirname, "..", "_data", "team.yml"), "utf8"));
  if (!Array.isArray(team) || team.length === 0) {
    fail("_data/team.yml: expected a non-empty list of team members");
  } else {
    const teamHtml = fs.readFileSync(TEAM_PAGE, "utf8");
    const grids = teamHtml.match(/<div class="team-grid"/g) || [];
    if (grids.length !== 1) fail(`team/index.html: expected exactly one team grid, found ${grids.length}`);

    // No group headings: every h2 on the Team page is a member name.
    const h2s = (teamHtml.match(/<h2(?:\s|>)/g) || []).length;
    const nameHeadings = (teamHtml.match(/<h2 class="team-name"/g) || []).length;
    if (h2s !== nameHeadings) fail("team/index.html: contains headings other than team-member names");

    // Cards are flat siblings of the grid, so slicing between consecutive
    // card opening tags yields each card's rendered markup.
    const cardStarts = [...teamHtml.matchAll(/<div class="team-card"/g)];
    const segments = cardStarts.map((m, i) => teamHtml.slice(m.index, i + 1 < cardStarts.length ? cardStarts[i + 1].index : teamHtml.length));
    if (cardStarts.length !== team.length) {
      fail(`team/index.html: expected ${team.length} team cards, found ${cardStarts.length}`);
    }

    // Data-file values could contain characters HTML-escapes in attributes.
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const initialsOf = (name) => {
      const words = name.split(" ");
      return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
    };

    for (const member of team) {
      const matches = segments.filter((s) => s.includes(`data-team-name="${esc(member.name)}"`));
      if (matches.length !== 1) {
        fail(`team/index.html: expected exactly one card for data-file member "${member.name}", found ${matches.length}`);
        continue;
      }
      const segment = matches[0];
      const attrs = segment.slice(0, segment.indexOf(">"));

      if (!attrs.includes(`data-team-role="${esc(member.role)}"`)) {
        fail(`team/index.html: "${member.name}" card does not carry role "${member.role}"`);
      }
      if (!attrs.includes(`data-team-institution="${esc(member.institution)}"`)) {
        fail(`team/index.html: "${member.name}" card does not carry institution "${member.institution}"`);
      }

      // Optional links: rendered hrefs match the data file exactly, and no
      // link is rendered for a type the member does not have.
      const links = member.links || {};
      const renderedLinks = segment.match(/<a\s/g) || [];
      if (renderedLinks.length !== Object.keys(links).length) {
        fail(`team/index.html: "${member.name}" card renders ${renderedLinks.length} links, data file has ${Object.keys(links).length}`);
      }
      for (const [type, url] of Object.entries(links)) {
        if (!segment.includes(`href="${esc(url)}"`)) {
          fail(`team/index.html: "${member.name}" card is missing its ${type} link to ${url}`);
        }
      }

      // Optional photo: an <img> when present, a legible initials avatar when not.
      if (member.photo) {
        const expectedSrc = `src="${BASEURL}/assets/img/team/${member.photo}"`;
        if (!segment.includes('<img class="team-photo"') || !segment.includes(expectedSrc)) {
          fail(`team/index.html: "${member.name}" card does not render photo assets/img/team/${member.photo}`);
        }
      } else {
        if (!segment.includes('class="team-avatar"')) {
          fail(`team/index.html: "${member.name}" card has neither photo nor initials avatar`);
        }
        if (!segment.includes(`>${initialsOf(member.name)}</div>`)) {
          fail(`team/index.html: "${member.name}" card avatar does not show initials "${initialsOf(member.name)}"`);
        }
      }
    }

    for (const segment of segments) {
      if (!team.some((m) => segment.includes(`data-team-name="${esc(m.name)}"`))) {
        fail("team/index.html: contains a card with no entry in _data/team.yml");
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`Site assertions FAILED (${failures.length}):`);
  for (const f of [...new Set(failures)]) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`Site assertions passed over ${htmlFiles.length} pages.`);

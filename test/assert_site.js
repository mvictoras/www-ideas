#!/usr/bin/env node
/**
 * Page and privacy assertions over the production build output (_site).
 *
 * Covers the site-shell acceptance criteria (nav pages, IDEAS title/wordmark,
 * search + dark-mode toggles, ASCR footer with both funder logos, no
 * email/mailto, no analytics, no removed al-folio features), the Team-page
 * acceptance criteria (grid matches _data/team.yml 1:1) and the
 * Publications-page acceptance criteria (every BibTeX entry rendered, grouped
 * by year, with Team Member names bolded from the team data file), and the
 * Research-page acceptance criteria (four Objectives render with Year-1
 * progress, canonical IDEAS expansion, no TIDES material).
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

// Data-file values could contain characters HTML escapes in rendered text.
const escapeHtml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Returns the complete <div ...>...</div> starting at html[startIndex] (the
// index of an opening <div), tracking nesting depth.
const extractDiv = (html, startIndex) => {
  let depth = 0;
  for (const match of html.slice(startIndex).matchAll(/<div\b[^>]*>|<\/div>/gi)) {
    depth += match[0].toLowerCase() === "</div>" ? -1 : 1;
    if (depth === 0) return html.slice(startIndex, startIndex + match.index + match[0].length);
  }
  return null;
};

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

// 2. Privacy applies to all published bytes, including binary metadata,
// assets and search data.
// Email-like addresses. The domain must end in an alphabetic TLD (>= 2
// letters), which skips npm package versions in CDN URLs (e.g.
// fontawesome-free@7.2.0) while still matching real addresses.
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;
for (const file of walk(SITE, "")) {
  let content = fs.readFileSync(file).toString("latin1");
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
// single grid with no institution-type group headings.
const TEAM_PAGE = path.join(SITE, "team", "index.html");
if (!fs.existsSync(TEAM_PAGE)) {
  fail("team/index.html: missing — the Team page did not build");
} else {
  const team = yaml.load(fs.readFileSync(path.join(__dirname, "..", "_data", "team.yml"), "utf8"));
  if (!Array.isArray(team) || team.length === 0) {
    fail("_data/team.yml: expected a non-empty list of team members");
  } else {
    const teamHtml = fs.readFileSync(TEAM_PAGE, "utf8");
    const gridStarts = [...teamHtml.matchAll(/<div class="team-grid">/g)];
    if (gridStarts.length !== 1) fail(`team/index.html: expected exactly one team grid, found ${gridStarts.length}`);

    // No group headings: every h2 on the Team page is a member name.
    const h2s = (teamHtml.match(/<h2(?:\s|>)/g) || []).length;
    const nameHeadings = (teamHtml.match(/<h2 class="team-name"/g) || []).length;
    if (h2s !== nameHeadings) fail("team/index.html: contains headings other than Team Member names");

    const teamGridHtml = gridStarts.length === 1 ? extractDiv(teamHtml, gridStarts[0].index) : null;
    if (!teamGridHtml) {
      fail("team/index.html: team grid is not a complete div");
    } else {
      // Cards are flat siblings of the grid, so slicing between consecutive
      // card opening tags yields each card's rendered markup.
      const cardStarts = [...teamGridHtml.matchAll(/<div class="team-card">/g)];
      const cardSegments = cardStarts.map((match, index) =>
        teamGridHtml.slice(match.index, index + 1 < cardStarts.length ? cardStarts[index + 1].index : teamGridHtml.length)
      );
      const pageCardCount = (teamHtml.match(/<div class="team-card">/g) || []).length;
      if (cardStarts.length !== team.length) {
        fail(`team/index.html: expected ${team.length} team cards in the grid, found ${cardStarts.length}`);
      }
      if (pageCardCount !== cardStarts.length) {
        fail(`team/index.html: found ${pageCardCount - cardStarts.length} team cards outside the grid`);
      }

      const initialsOf = (name) => {
        const words = name.split(" ");
        return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
      };

      for (const member of team) {
        const renderedName = `<h2 class="team-name">${escapeHtml(member.name)}</h2>`;
        const matches = cardSegments.filter((segment) => segment.includes(renderedName));
        if (matches.length !== 1) {
          fail(`team/index.html: expected exactly one card for data-file member "${member.name}", found ${matches.length}`);
          continue;
        }
        const segment = matches[0];

        if (!segment.includes(`<p class="team-role">${escapeHtml(member.role)}</p>`)) {
          fail(`team/index.html: "${member.name}" card does not render role "${member.role}"`);
        }
        if (!segment.includes(`<p class="team-institution">${escapeHtml(member.institution)}</p>`)) {
          fail(`team/index.html: "${member.name}" card does not render institution "${member.institution}"`);
        }

        // Optional links: rendered hrefs match the data file exactly, and no
        // link is rendered for a type the member does not have.
        const links = member.links || {};
        const renderedLinks = segment.match(/<a\s/g) || [];
        if (renderedLinks.length !== Object.keys(links).length) {
          fail(`team/index.html: "${member.name}" card renders ${renderedLinks.length} links, data file has ${Object.keys(links).length}`);
        }
        for (const [type, url] of Object.entries(links)) {
          if (!segment.includes(`href="${escapeHtml(url)}"`)) {
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

      for (const segment of cardSegments) {
        if (!team.some((member) => segment.includes(`<h2 class="team-name">${escapeHtml(member.name)}</h2>`))) {
          fail("team/index.html: contains a card with no entry in _data/team.yml");
        }
      }
    }
  }
}

// 6. Publications: every entry in _bibliography/papers.bib is rendered on the
// Publications page, grouped by year, with DOI links where supplied, BibTeX
// export and abstract toggle — and Team Member names in author lists are bold
// from the team data file, while non-members are plain.
const PUBLICATIONS_PAGE = path.join(SITE, "publications", "index.html");
const EXPECTED_PUBLICATION_KEYS = [
  "mathai2026nl2scivis",
  "yildiz2025llmworkflows",
  "bauer2026gscache",
  "sun2026importancemask",
  "martin2026fixedbudget",
  "martin20263dfielddatareduction",
];
const PREPRINT_PUBLICATION_KEYS = new Set(["martin2026fixedbudget", "martin20263dfielddatareduction"]);
if (!fs.existsSync(PUBLICATIONS_PAGE)) {
  fail("publications/index.html: missing — the Publications page did not build");
} else {
  const bibText = fs.readFileSync(path.join(__dirname, "..", "_bibliography", "papers.bib"), "utf8");
  const bibEntries = [];
  const entryStart = /^@(\w+)\{\s*([^,\s]+),/gm;
  let entryMatch;
  while ((entryMatch = entryStart.exec(bibText)) !== null) {
    const nextEntry = bibText.indexOf("\n@", entryMatch.index + 1);
    const block = bibText.slice(entryMatch.index, nextEntry === -1 ? undefined : nextEntry);
    const field = (name) => {
      const m = block.match(new RegExp(`^\\s*${name}\\s*=\\s*\\{([\\s\\S]*?)\\},?\\s*$`, "m"));
      return m ? m[1].replace(/\s+/g, " ").trim() : null;
    };
    bibEntries.push({
      key: entryMatch[2],
      authors: (field("author") || "").split(" and ").map((a) => {
        const [last, first = ""] = a.split(",").map((s) => s.trim());
        return { last, first };
      }),
      year: field("year"),
      doi: field("doi"),
      note: field("note"),
      volume: field("volume"),
      number: field("number"),
      pages: field("pages"),
    });
  }
  if (bibEntries.length !== EXPECTED_PUBLICATION_KEYS.length) {
    fail(
      `_bibliography/papers.bib: expected ${EXPECTED_PUBLICATION_KEYS.length} entries, found ${bibEntries.length}`
    );
  }
  const bibEntryKeys = new Set(bibEntries.map((entry) => entry.key));
  for (const expectedPublicationKey of EXPECTED_PUBLICATION_KEYS) {
    if (!bibEntryKeys.has(expectedPublicationKey)) {
      fail(`_bibliography/papers.bib: missing required publication ${expectedPublicationKey}`);
    }
  }

  const team = yaml.load(fs.readFileSync(path.join(__dirname, "..", "_data", "team.yml"), "utf8"));
  const publicationNameKey = (value) => value.replace(/\s+/g, " ").trim().toLowerCase();
  const teamPublicationNames = new Set(
    team.flatMap((member) => [member.name, ...(member.publication_name_aliases || [])]).map(publicationNameKey)
  );
  const isTeamMember = (last, first) => teamPublicationNames.has(publicationNameKey(`${first} ${last}`));

  const pubsHtml = fs.readFileSync(PUBLICATIONS_PAGE, "utf8");

  // Every bib entry renders exactly once, keyed by its citation key.
  for (const entry of bibEntries) {
    const entryDivs = [...pubsHtml.matchAll(new RegExp(`<div id="${entry.key}"(?:\\s|>)`, "g"))];
    if (entryDivs.length !== 1) {
      fail(`publications/index.html: expected exactly one rendered entry for ${entry.key}, found ${entryDivs.length}`);
      continue;
    }
    const entryDiv = extractDiv(pubsHtml, entryDivs[0].index);
    if (!entryDiv) {
      fail(`publications/index.html: entry ${entry.key} is not a complete div`);
      continue;
    }

    const authorDivMatch = entryDiv.match(/<div class="author">([\s\S]*?)<\/div>/);
    if (!authorDivMatch) {
      fail(`publications/index.html: entry ${entry.key} has no author list`);
      continue;
    }
    const authorHtml = authorDivMatch[1];
    const strongTexts = [...authorHtml.matchAll(/<strong>([\s\S]*?)<\/strong>/g)].map((m) =>
      m[1]
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim()
    );

    for (const author of entry.authors) {
      const renderedName = `${author.first} ${author.last}`.replace(/\s+/g, " ").trim();
      if (isTeamMember(author.last, author.first)) {
        if (!strongTexts.some((t) => t.toLowerCase() === renderedName.toLowerCase())) {
          fail(`publications/index.html: Team Member "${renderedName}" is not bold in the ${entry.key} author list`);
        }
      } else if (strongTexts.some((t) => t.toLowerCase().includes(author.last.toLowerCase()))) {
        fail(`publications/index.html: non-member "${renderedName}" is bold in the ${entry.key} author list`);
      }
    }

    if (entry.doi && !entryDiv.includes(`href="https://doi.org/${entry.doi}"`)) {
      fail(`publications/index.html: entry ${entry.key} does not link its DOI ${entry.doi}`);
    }
    if (!entryDiv.includes('class="bibtex btn') || !entryDiv.includes('class="bibtex hidden"')) {
      fail(`publications/index.html: entry ${entry.key} has no BibTeX export`);
    }
    if (!entryDiv.includes('class="abstract btn') || !entryDiv.includes('class="abstract hidden"')) {
      fail(`publications/index.html: entry ${entry.key} has no abstract toggle`);
    }
    if (!entryDiv.includes('class="periodical"')) {
      fail(`publications/index.html: entry ${entry.key} does not render its venue`);
    }
    if (PREPRINT_PUBLICATION_KEYS.has(entry.key)) {
      if (entry.note !== "Pre-print") {
        fail(`_bibliography/papers.bib: pre-print ${entry.key} must have note = {Pre-print}`);
      }
      if (!/<div class="periodical">\s*Pre-print\s*<\/div>/.test(entryDiv)) {
        fail(`publications/index.html: pre-print ${entry.key} is not marked as Pre-print`);
      }
    }

    // Volume, issue and pages render in the periodical line (issue #4 seed
    // data: "IEEE TVCG 32(1):901–911", "pp. 2225–2233").
    const periodical = entryDiv.match(/<div class="periodical">([\s\S]*?)<\/div>/);
    if (periodical) {
      const periodicalText = periodical[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
      const detail = [];
      if (entry.volume) detail.push(entry.volume + (entry.number ? `(${entry.number})` : ""));
      if (entry.pages) detail.push(entry.pages.replace(/--/g, "–"));
      for (const publicationDetail of detail) {
        if (!periodicalText.includes(publicationDetail)) {
          fail(`publications/index.html: entry ${entry.key} does not render "${publicationDetail}"`);
        }
      }
    }
  }

  // Bold author names must be Team Members and all Team Members from the data
  // file must be bold — either direction means the data files drifted apart.
  for (const strongText of [...pubsHtml.matchAll(/<div class="author">([\s\S]*?)<\/div>/g)].flatMap((authorMatch) =>
    [...authorMatch[1].matchAll(/<strong>([\s\S]*?)<\/strong>/g)].map((strongMatch) =>
      strongMatch[1].replace(/\s+/g, " ").trim()
    )
  )) {
    if (!teamPublicationNames.has(publicationNameKey(strongText))) {
      fail(`publications/index.html: "${strongText}" is bold but has no entry in _data/team.yml`);
    }
  }

  // Grouped by year: one heading per year present in the bib file.
  const renderedYears = [...pubsHtml.matchAll(/<h2 class="bibliography">([^<]*)<\/h2>/g)].map((m) => m[1].trim());
  const bibYears = [...new Set(bibEntries.map((e) => e.year).filter(Boolean))];
  for (const year of bibYears) {
    if (!renderedYears.includes(year)) fail(`publications/index.html: no year group for ${year}`);
  }
  for (const year of renderedYears) {
    if (!bibYears.includes(year)) fail(`publications/index.html: year group ${year} has no entries in _bibliography/papers.bib`);
  }

  // All authors shown: no "N more authors" truncation hides any name.
  if (/<span class="more-authors"/.test(pubsHtml)) {
    fail("publications/index.html: author lists are truncated; all BibTeX authors must render");
  }
}

// 7. Research page: the four IDEAS Objectives render in order, each with a
// description, a Year-1 progress section and progress bullets. The page uses
// the canonical expansion and mentions no TIDES material. (Present tense and
// accuracy against the progress report are content conventions checked in
// review, not by this script.)
const RESEARCH_PAGE = path.join(SITE, "research", "index.html");
const OBJECTIVE_TITLES = [
  "Efficient Data Representations",
  "AI-Driven Rendering and Visualization",
  "Human-Centered Exploration of Scientific Data",
  "System Integration and Testing",
];
if (!fs.existsSync(RESEARCH_PAGE)) {
  fail("research/index.html: missing — the Research page did not build");
} else {
  const researchHtml = fs.readFileSync(RESEARCH_PAGE, "utf8");
  const objectiveStarts = [...researchHtml.matchAll(/<section class="objective"/g)];
  if (objectiveStarts.length !== OBJECTIVE_TITLES.length) {
    fail(`research/index.html: expected ${OBJECTIVE_TITLES.length} Objective sections, found ${objectiveStarts.length}`);
  } else {
    // Each segment ends at its own closing tag, so text outside the Objective
    // (footer, nav) cannot satisfy its checks.
    OBJECTIVE_TITLES.forEach((title, index) => {
      const start = objectiveStarts[index].index;
      const end = researchHtml.indexOf("</section>", start);
      const segment = end === -1 ? "" : researchHtml.slice(start, end);
      const heading = segment.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
      const headingText = heading ? heading[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() : "";
      if (headingText !== title) {
        fail(`research/index.html: Objective ${index + 1} heading is "${headingText}", expected "${title}"`);
      }
      if (!/<h3[^>]*>\s*Year-1 progress\s*<\/h3>/.test(segment)) {
        fail(`research/index.html: Objective "${title}" has no Year-1 progress section`);
      }
      if (!/<h3[^>]*>\s*Year-1 progress\s*<\/h3>[\s\S]*<li>/.test(segment)) {
        fail(`research/index.html: Objective "${title}" has no Year-1 progress items`);
      }
    });
  }
  if (!researchHtml.includes("Intelligent Data Exploration Assistant for Science")) {
    fail("research/index.html: canonical IDEAS expansion missing");
  }
  if (/Exploration and Analysis/.test(researchHtml)) {
    fail("research/index.html: uses the non-canonical IDEAS expansion");
  }
  if (/\bTIDES\b/.test(researchHtml)) {
    fail("research/index.html: mentions TIDES; the Research page must carry no TIDES material");
  }
}

if (failures.length > 0) {
  console.error(`Site assertions FAILED (${failures.length}):`);
  for (const f of [...new Set(failures)]) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`Site assertions passed over ${htmlFiles.length} pages.`);

#!/usr/bin/env node
/**
 * Page and privacy assertions over the production build output (_site).
 *
 * Covers the site-shell acceptance criteria (nav pages, IDEAS title and
 * header lockup,
 * search + dark-mode toggles, ASCR footer with both funder logos, no
 * email/mailto, no analytics, no removed al-folio features), the Team-page
 * acceptance criteria (grid matches _data/team.yml 1:1) and the
 * Publications-page acceptance criteria (every BibTeX entry rendered, grouped
 * by year, with Team Member names bolded from the team data file), and the
 * Research-page acceptance criteria (four Objectives render with their
 * progress in the text, canonical IDEAS expansion, no TIDES material), the
 * Use-Cases-page acceptance criteria (active/upcoming split, canonical names,
 * captioned and credited proposal figures, breeding-blanket figure absent) and
 * the Software-page acceptance criteria (one card per Software Release,
 * matching _data/software.yml 1:1, with repository, paper DOI and project
 * page links where present) and the Events-page acceptance criteria (every
 * _events/ entry built from its structured fields with visible TBA markers,
 * the RSVP placeholder or link, and the upcoming/past index split relative
 * to the build date) and the News-page acceptance criteria (every _news/
 * entry rendered as an inline dated row, newest first, with no Event
 * appearing in the News page or the RSS feed), and the Home-page acceptance
 * criteria (hypothesis hero, Objective and Use Case cards linking into
 * Research/Use Cases, the newest News Items and the next upcoming Event
 * rendering automatically from their collections, the sibling-Thrust note —
 * and TIDES mentioned only there, site-wide), the brand-palette acceptance
 * criteria (the Ink/ramp token overrides present on every page, both accents
 * meeting WCAG AA against their backgrounds), and the logo and favicon
 * acceptance criteria (the Horizontal Lockup on every page in both colour
 * versions with an on-palette, dark-legible ramp; the multi-size .ico and
 * Apple touch icon linked everywhere), and the P1 site-design acceptance
 * criteria (issue #20: the Inter and JetBrains Mono type families and the
 * Partner Strip footer on every page, the one-row header, the Home Ink hero
 * and 2×2 Objective cards with summaries, and the figure-led Use Case cards).
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

// Front matter of the collection/project sources, read directly so the
// assertions can compare rendered pages against their own sources.
const parseFrontMatter = (file) => {
  const match = fs.readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---\n/);
  return match ? yaml.load(match[1]) : null;
};

const projectsDir = path.join(__dirname, "..", "_projects");

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

// Returns the complete element starting at html[startIndex] (the index of an
// opening <tag>), up to and including its closing tag. Used for elements that
// never nest their own kind (sections, the news list).
const extractElement = (html, startIndex, tagName) => {
  const end = html.indexOf(`</${tagName}>`, startIndex);
  return end === -1 ? null : html.slice(startIndex, end + tagName.length + 3);
};

// True when the img with the given src renders inside a P1 figure frame
// (issue #20) — the nearest opening tag before it is the frame's div, not
// the <figure> itself.
const figureIsFramed = (html, srcPattern) => {
  const imgIndex = html.indexOf(srcPattern);
  if (imgIndex === -1) return false;
  const frameOpen = html.lastIndexOf('<div class="ideas-figure-frame"', imgIndex);
  const figureOpen = html.lastIndexOf("<figure", imgIndex);
  return frameOpen !== -1 && frameOpen > figureOpen;
};

// 1. Every nav page exists and has one primary heading.
for (const [index, p] of NAV_PAGES.entries()) {
  const file = path.join(SITE, p);
  if (!fs.existsSync(file)) {
    fail(`missing page: ${p}`);
    continue;
  }
  const html = fs.readFileSync(file, "utf8");
  const headings = html.match(/<h1(?:\s|>)/gi) || [];
  if (headings.length !== 1) fail(`${p}: expected one primary heading, found ${headings.length}`);

  // The header marks the current page with aria-current="page" on exactly one
  // navbar link — the link to the page itself (P1's accent underline hangs
  // off it, issue #20).
  const navStart = html.indexOf('id="navbar');
  const navEnd = html.indexOf("</nav>", navStart);
  const navRegion = navStart === -1 || navEnd === -1 ? "" : html.slice(navStart, navEnd);
  const currentLinks = [...navRegion.matchAll(/<a\b[^>]*aria-current="page"[^>]*>/g)];
  if (currentLinks.length !== 1) {
    fail(`${p}: expected exactly one aria-current="page" nav link, found ${currentLinks.length}`);
  } else if (!currentLinks[0][0].includes(`href="${NAV_LINKS[index]}"`)) {
    fail(`${p}: aria-current="page" is not on the link to ${NAV_LINKS[index]}`);
  }
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

// 3. Per-page checks: navbar, header lockup, favicons, toggles, footer and no
// analytics.
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
  if (!html.includes("assets/img/logo/ideas-horizontal-lockup-color-on-light.svg")) fail(`${rel}: light-mode header lockup missing`);
  if (!html.includes("assets/img/logo/ideas-horizontal-lockup-color-on-ink-lightened.svg")) fail(`${rel}: dark-mode header lockup missing`);
  if (!/rel="shortcut icon"\s+href="[^"]*\/favicon\.ico/.test(html)) fail(`${rel}: favicon.ico link missing`);
  if (!/rel="apple-touch-icon"\s+href="[^"]*\/apple-touch-icon\.png/.test(html)) fail(`${rel}: apple-touch-icon link missing`);
  if (!html.includes("DE-AC02-06CH11357")) fail(`${rel}: ASCR contract missing from footer`);
  if (!html.includes("Office of Science")) fail(`${rel}: Office of Science acknowledgment missing`);
  if (!html.includes("assets/img/logos/ideas-partner-strip-large-on-light.svg")) {
    fail(`${rel}: the Partner Strip is missing from the footer`);
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
// single grid with no institution-type group headings. P1 (issue #22): the
// grid sits under one "Team Members" section heading with the rule
// underneath; cards are figure-led (media frame with one consistent crop),
// the institution is a mono kicker, and a member without a photo gets a
// brand-coloured initials placeholder instead of a broken image.
const TEAM_PAGE = path.join(SITE, "team", "index.html");
if (!fs.existsSync(TEAM_PAGE)) {
  fail("team/index.html: missing — the Team page did not build");
} else {
  const team = yaml.load(fs.readFileSync(path.join(__dirname, "..", "_data", "team.yml"), "utf8"));
  if (!Array.isArray(team) || team.length === 0) {
    fail("_data/team.yml: expected a non-empty list of team members");
  } else {
    const teamHtml = fs.readFileSync(TEAM_PAGE, "utf8");

    // The P1 section heading: one block head with the rule underneath.
    if ((teamHtml.match(/<h2 class="ideas-block-title">Team Members<\/h2>/g) || []).length !== 1) {
      fail('team/index.html: expected exactly one "Team Members" P1 section heading');
    }
    if (!teamHtml.includes('<div class="ideas-block-head">')) {
      fail("team/index.html: the Team section heading does not use the P1 block head with the rule underneath");
    }

    // No group headings: the block title is the page's only h2; every member
    // name is an h3 inside the grid.
    const h2s = (teamHtml.match(/<h2(?:\s|>)/g) || []).length;
    if (h2s !== 1) fail(`team/index.html: expected one section h2 (the block title), found ${h2s}`);

    const gridStarts = [...teamHtml.matchAll(/<div class="team-grid ideas-cards">/g)];
    if (gridStarts.length !== 1) fail(`team/index.html: expected exactly one team grid, found ${gridStarts.length}`);

    const teamGridHtml = gridStarts.length === 1 ? extractDiv(teamHtml, gridStarts[0].index) : null;
    if (!teamGridHtml) {
      fail("team/index.html: team grid is not a complete div");
    } else {
      // Cards are flat siblings of the grid, so slicing between consecutive
      // card opening tags yields each card's rendered markup.
      const cardStarts = [...teamGridHtml.matchAll(/<div class="team-card ideas-card">/g)];
      const cardSegments = cardStarts.map((match, index) =>
        teamGridHtml.slice(match.index, index + 1 < cardStarts.length ? cardStarts[index + 1].index : teamGridHtml.length)
      );
      const pageCardCount = (teamHtml.match(/<div class="team-card ideas-card">/g) || []).length;
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
        const renderedName = `<h3 class="team-name">${escapeHtml(member.name)}</h3>`;
        const matches = cardSegments.filter((segment) => segment.includes(renderedName));
        if (matches.length !== 1) {
          fail(`team/index.html: expected exactly one card for data-file member "${member.name}", found ${matches.length}`);
          continue;
        }
        const segment = matches[0];

        if (!segment.includes(`<p class="team-role">${escapeHtml(member.role)}</p>`)) {
          fail(`team/index.html: "${member.name}" card does not render role "${member.role}"`);
        }
        if (!segment.includes(`<p class="team-institution ideas-kicker">${escapeHtml(member.institution)}</p>`)) {
          fail(`team/index.html: "${member.name}" card does not render institution "${member.institution}" as a mono kicker`);
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

        // Optional photo: a consistently-cropped <img> in the P1 media frame
        // when present, a brand-coloured initials placeholder when not.
        if (!segment.includes('<div class="team-media ideas-card-media">')) {
          fail(`team/index.html: "${member.name}" card has no P1 media frame for its consistent crop`);
        }
        if (member.photo) {
          const expectedSrc = `src="${BASEURL}/assets/img/team/${member.photo}"`;
          if (!segment.includes('<img class="team-photo"') || !segment.includes(expectedSrc)) {
            fail(`team/index.html: "${member.name}" card does not render photo assets/img/team/${member.photo}`);
          }
        } else {
          if (!segment.includes('<div class="team-avatar"')) {
            fail(`team/index.html: "${member.name}" card has neither photo nor initials avatar`);
          }
          if (!segment.includes(`<span class="team-avatar-initials">${initialsOf(member.name)}</span>`)) {
            fail(`team/index.html: "${member.name}" card avatar does not show initials "${initialsOf(member.name)}"`);
          }
        }
      }

      for (const segment of cardSegments) {
        if (!team.some((member) => segment.includes(`<h3 class="team-name">${escapeHtml(member.name)}</h3>`))) {
          fail("team/index.html: contains a card with no entry in _data/team.yml");
        }
      }

      // One consistent aspect ratio for every photo crop, and a brand-ramp
      // placeholder background — both live in the page's own style block.
      if (!/\.team-media \{[^}]*aspect-ratio: 1 \/ 1;/.test(teamHtml)) {
        fail("team/index.html: the media frame does not fix one aspect ratio for the photo crops");
      }
      if (!/\.team-avatar \{[^}]*linear-gradient\(90deg, #1e3a8a/.test(teamHtml)) {
        fail("team/index.html: the initials placeholder is not brand-coloured (no ramp gradient)");
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
    fail(`_bibliography/papers.bib: expected ${EXPECTED_PUBLICATION_KEYS.length} entries, found ${bibEntries.length}`);
  }
  const bibEntryKeys = new Set(bibEntries.map((entry) => entry.key));
  for (const expectedPublicationKey of EXPECTED_PUBLICATION_KEYS) {
    if (!bibEntryKeys.has(expectedPublicationKey)) {
      fail(`_bibliography/papers.bib: missing required publication ${expectedPublicationKey}`);
    }
  }

  const team = yaml.load(fs.readFileSync(path.join(__dirname, "..", "_data", "team.yml"), "utf8"));
  const publicationNameKey = (value) => value.replace(/\s+/g, " ").trim().toLowerCase();
  const teamPublicationNames = new Set(team.flatMap((member) => [member.name, ...(member.publication_name_aliases || [])]).map(publicationNameKey));
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
    [...authorMatch[1].matchAll(/<strong>([\s\S]*?)<\/strong>/g)].map((strongMatch) => strongMatch[1].replace(/\s+/g, " ").trim())
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
// description and progress written into its prose (no separate Year-1
// progress heading). The page uses
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
      const headingText = heading
        ? heading[1]
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim()
        : "";
      if (headingText !== title) {
        fail(`research/index.html: Objective ${index + 1} heading is "${headingText}", expected "${title}"`);
      }
      // Progress is written into the Objective's prose, not a separate section.
      if (/<h3[^>]*>\s*Year-1 progress/i.test(segment)) {
        fail(`research/index.html: Objective "${title}" has a separate Year-1 progress heading`);
      }
      // The summary plus at least one prose paragraph carrying the progress.
      if ((segment.match(/<p[\s>]/g) || []).length < 2) {
        fail(`research/index.html: Objective "${title}" has no progress prose`);
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

  // Research figures: the IDEAS overview (on the page) and the
  // representative-pixels figure (in the first Objective). Each must be
  // captioned, have alt text, and resolve to a file under the base path.
  const RESEARCH_FIGURES = [
    { name: "IDEAS overview", file: "ideas-overview.png" },
    { name: "representative pixels", file: "representative-pixels.png" },
  ];
  for (const figure of RESEARCH_FIGURES) {
    const srcPattern = `src="${BASEURL}/assets/img/research/${figure.file}"`;
    if (!researchHtml.includes(srcPattern)) {
      fail(`research/index.html: ${figure.name} figure does not reference ${BASEURL}/assets/img/research/${figure.file}`);
    }
    if (!fs.existsSync(path.join(SITE, "assets", "img", "research", figure.file))) {
      fail(`assets/img/research/${figure.file}: not published in the build`);
    }
    const figureBlock = researchHtml.match(
      new RegExp(`<figure[^>]*>(?:(?!</figure>)[\\s\\S])*?${srcPattern.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&")}[\\s\\S]*?</figure>`)
    );
    if (!figureBlock) {
      fail(`research/index.html: ${figure.name} is not inside a <figure>`);
    } else {
      if (!/<img[^>]*\salt="[^"]+"/.test(figureBlock[0])) fail(`research/index.html: ${figure.name} figure has no alt text`);
      if (!/<figcaption>[\s\S]*?\S[\s\S]*?<\/figcaption>/.test(figureBlock[0])) fail(`research/index.html: ${figure.name} figure has no caption`);
      if (!/Credit:/.test(figureBlock[0])) fail(`research/index.html: ${figure.name} figure has no credit line`);
      // P1 (issue #20): figures render inside a frame on the figure surface.
      if (!figureIsFramed(figureBlock[0], srcPattern)) {
        fail(`research/index.html: ${figure.name} is not rendered in a P1 figure frame`);
      }
    }
  }

  // P1 (issue #20): every Objective's own figure (if any) renders in its
  // section — the overview crops from the card figures included — and is
  // framed like the rest.
  const researchObjectives = fs
    .readdirSync(projectsDir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const data = parseFrontMatter(path.join(projectsDir, name));
      return data && data.category === "objective" ? { slug: name.replace(/\.md$/, ""), ...data } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.importance - b.importance);
  for (const objective of researchObjectives) {
    if (!objective.figure) continue;
    const srcPattern = `${BASEURL}/${objective.figure.src}`;
    if (!researchHtml.includes(srcPattern)) {
      fail(`research/index.html: Objective "${objective.title}" does not render its figure ${objective.figure.src}`);
      continue;
    }
    if (!fs.existsSync(path.join(SITE, objective.figure.src))) {
      fail(`${objective.figure.src}: not published in the build`);
    }
    if (!figureIsFramed(researchHtml, srcPattern)) {
      fail(`research/index.html: the ${objective.figure.src} figure is not rendered in a P1 figure frame`);
    }
  }
}

// 8. Use Cases page: active and upcoming Use Cases are clearly separated
// (each inside its group, active before upcoming); the canonical names are
// used ("Turbulence in Complex Geometries", never "Fusion Flow"); each Use
// Case explains its bottleneck and the assistant's approach; the proposal's
// HACC cluster and XPCS interface figures are captioned and credited; and
// the fusion breeding-blanket figure is absent.
const USE_CASES_PAGE = path.join(SITE, "use-cases", "index.html");
const USE_CASE_GROUPS = [
  {
    id: "active",
    kicker: "Active Use Case",
    titles: ["Cosmology", "Turbulence in Complex Geometries"],
  },
  {
    id: "upcoming",
    kicker: "Upcoming Use Case",
    titles: ["X-Ray Science"],
  },
];
const USE_CASE_FIGURES = [
  { name: "HACC cluster", file: "hacc.png" },
  { name: "XPCS interface", file: "xpcs-interface.png" },
];
if (!fs.existsSync(USE_CASES_PAGE)) {
  fail("use-cases/index.html: missing — the Use Cases page did not build");
} else {
  const ucHtml = fs.readFileSync(USE_CASES_PAGE, "utf8");
  if (/Fusion Flow/i.test(ucHtml)) {
    fail('use-cases/index.html: uses the retired name "Fusion Flow"');
  }

  const groupHtml = (groupId) => {
    const start = ucHtml.indexOf(`<div class="use-case-group" id="${groupId}">`);
    return start === -1 ? null : extractDiv(ucHtml, start);
  };
  const groups = USE_CASE_GROUPS.map((group) => ({ ...group, html: groupHtml(group.id) }));
  if (groups.some((group) => !group.html)) {
    fail("use-cases/index.html: missing active/upcoming group separation");
  } else {
    if (ucHtml.indexOf('id="active"') > ucHtml.indexOf('id="upcoming"')) {
      fail("use-cases/index.html: the active group does not precede the upcoming group");
    }

    for (const group of groups) {
      const sectionStarts = [...group.html.matchAll(/<section class="use-case"/g)];
      if (sectionStarts.length !== group.titles.length) {
        fail(`use-cases/index.html: expected ${group.titles.length} use cases in the ${group.id} group, found ${sectionStarts.length}`);
        continue;
      }
      group.titles.forEach((title, index) => {
        const start = sectionStarts[index].index;
        const end = group.html.indexOf("</section>", start);
        const segment = end === -1 ? "" : group.html.slice(start, end);
        const heading = segment.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
        const headingText = heading
          ? heading[1]
              .replace(/<[^>]+>/g, "")
              .replace(/\s+/g, " ")
              .trim()
          : "";
        if (headingText !== title) {
          fail(`use-cases/index.html: ${group.id} use case ${index + 1} is "${headingText}", expected "${title}"`);
        }
        // The kicker states the status, so the split is visible beyond the
        // group heading.
        if (!segment.includes(group.kicker)) {
          fail(`use-cases/index.html: "${title}" does not carry the "${group.kicker}" kicker`);
        }
        // The tagline plus at least two prose paragraphs: the bottleneck and
        // how the IDEAS assistant addresses it.
        if ((segment.match(/<p[\s>]/g) || []).length < 3) {
          fail(`use-cases/index.html: "${title}" does not explain its bottleneck and the assistant's approach`);
        }
      });
    }

    // No use-case section outside the two groups.
    const totalSections = (ucHtml.match(/<section class="use-case"/g) || []).length;
    const expectedSections = USE_CASE_GROUPS.reduce((total, group) => total + group.titles.length, 0);
    if (totalSections !== expectedSections) {
      fail(`use-cases/index.html: found ${totalSections - expectedSections} use-case sections outside the groups`);
    }

    // Proposal figures: referenced under the base path, published, inside a
    // <figure> with alt text, caption and credit.
    for (const figure of USE_CASE_FIGURES) {
      const srcPattern = `src="${BASEURL}/assets/img/use-cases/${figure.file}"`;
      if (!ucHtml.includes(srcPattern)) {
        fail(`use-cases/index.html: ${figure.name} figure does not reference ${BASEURL}/assets/img/use-cases/${figure.file}`);
      }
      if (!fs.existsSync(path.join(SITE, "assets", "img", "use-cases", figure.file))) {
        fail(`assets/img/use-cases/${figure.file}: not published in the build`);
      }
      const figureBlock = ucHtml.match(
        new RegExp(`<figure[^>]*>(?:(?!</figure>)[\\s\\S])*?${srcPattern.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&")}[\\s\\S]*?</figure>`)
      );
      if (!figureBlock) {
        fail(`use-cases/index.html: ${figure.name} is not inside a <figure>`);
      } else {
        if (!/<img[^>]*\salt="[^"]+"/.test(figureBlock[0])) fail(`use-cases/index.html: ${figure.name} figure has no alt text`);
        if (!/<figcaption>[\s\S]*?\S[\s\S]*?<\/figcaption>/.test(figureBlock[0])) fail(`use-cases/index.html: ${figure.name} figure has no caption`);
        if (!/Credit:/.test(figureBlock[0])) fail(`use-cases/index.html: ${figure.name} figure has no credit line`);
      }
    }

    // The fusion breeding-blanket figure is excluded (issue #6): the asset
    // must not be published anywhere in the build. (The words "breeding
    // blanket" may appear in prose as motivation; only the figure is barred.)
    if (walk(SITE, "").some((file) => /breeding-blanket/i.test(path.basename(file)))) {
      fail("the fusion breeding-blanket figure is published in the build; it must be absent");
    }
  }
}

// 9. Software: every entry in _data/software.yml renders exactly one card on
// the Software page — with its description and repository link, plus the
// paper DOI and project page when present — and no card exists without a
// data-file entry (adding a release is a data-file edit only).
const SOFTWARE_PAGE = path.join(SITE, "software", "index.html");
if (!fs.existsSync(SOFTWARE_PAGE)) {
  fail("software/index.html: missing — the Software page did not build");
} else {
  const softwareReleases = yaml.load(fs.readFileSync(path.join(__dirname, "..", "_data", "software.yml"), "utf8"));
  if (!Array.isArray(softwareReleases) || softwareReleases.length === 0) {
    fail("_data/software.yml: expected a non-empty list of Software Releases");
  } else {
    const softwareHtml = fs.readFileSync(SOFTWARE_PAGE, "utf8");
    const softwareGridStarts = [...softwareHtml.matchAll(/<div class="software-grid">/g)];
    if (softwareGridStarts.length !== 1) fail(`software/index.html: expected exactly one software grid, found ${softwareGridStarts.length}`);

    const softwareGridHtml = softwareGridStarts.length === 1 ? extractDiv(softwareHtml, softwareGridStarts[0].index) : null;
    if (!softwareGridHtml) {
      fail("software/index.html: software grid is not a complete div");
    } else {
      // Cards are flat siblings of the grid, so slicing between consecutive
      // card opening tags yields each card's rendered markup.
      const softwareCardStarts = [...softwareGridHtml.matchAll(/<div class="software-card">/g)];
      const softwareCardSegments = softwareCardStarts.map((match, index) =>
        softwareGridHtml.slice(match.index, index + 1 < softwareCardStarts.length ? softwareCardStarts[index + 1].index : softwareGridHtml.length)
      );
      const pageSoftwareCardCount = (softwareHtml.match(/<div class="software-card">/g) || []).length;
      if (softwareCardStarts.length !== softwareReleases.length) {
        fail(`software/index.html: expected ${softwareReleases.length} software cards in the grid, found ${softwareCardStarts.length}`);
      }
      if (pageSoftwareCardCount !== softwareCardStarts.length) {
        fail(`software/index.html: found ${pageSoftwareCardCount - softwareCardStarts.length} software cards outside the grid`);
      }

      for (const release of softwareReleases) {
        const renderedName = `<h2 class="software-name">${escapeHtml(release.name)}</h2>`;
        const matches = softwareCardSegments.filter((segment) => segment.includes(renderedName));
        if (matches.length !== 1) {
          fail(`software/index.html: expected exactly one card for data-file release "${release.name}", found ${matches.length}`);
          continue;
        }
        const segment = matches[0];

        if (!segment.includes(`<p class="software-description">${escapeHtml(release.description)}</p>`)) {
          fail(`software/index.html: "${release.name}" card does not render its description`);
        }
        if (!segment.includes(`href="${escapeHtml(release.repository)}"`)) {
          fail(`software/index.html: "${release.name}" card does not link its repository ${release.repository}`);
        }

        // Optional fields render when present and are not hard-coded on the
        // card when absent.
        if (release.paper_doi) {
          if (!segment.includes(`href="https://doi.org/${escapeHtml(release.paper_doi)}"`)) {
            fail(`software/index.html: "${release.name}" card does not link its paper DOI ${release.paper_doi}`);
          }
        } else if (/doi\.org/.test(segment)) {
          fail(`software/index.html: "${release.name}" card links to doi.org but has no paper_doi in the data file`);
        }
        if (release.project_page) {
          if (!segment.includes(`href="${escapeHtml(release.project_page)}"`)) {
            fail(`software/index.html: "${release.name}" card does not link its project page ${release.project_page}`);
          }
        }
      }

      for (const segment of softwareCardSegments) {
        if (!softwareReleases.some((release) => segment.includes(`<h2 class="software-name">${escapeHtml(release.name)}</h2>`))) {
          fail("software/index.html: contains a card with no entry in _data/software.yml");
        }
      }
    }
  }
}

// 10. Events: every entry in _events/ builds a page at /events/<slug>/ from
// its structured fields (dates with per-day notes, venue, format, audience,
// RSVP, agenda, travel notes); unset fields render as visible TBA markers
// (never blank) and an empty rsvp_url renders the "RSVP link coming soon"
// placeholder instead of a link; and the Events index places each event
// under Upcoming or Past relative to the build date, so an event moves
// groups automatically on the first build after its end date.
const ALL_HANDS_SLUG = "all-hands-2027";
const EVENTS_DIR = path.join(__dirname, "..", "_events");
const eventSlugs = fs
  .readdirSync(EVENTS_DIR)
  .filter((name) => name.endsWith(".md"))
  .map((name) => name.replace(/\.md$/, ""));
// Matches the layout's date format ("Tuesday, February 2, 2027").
const formatEventDay = (yamlDate) => {
  const [year, month, day] = String(yamlDate).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

if (eventSlugs.length === 0) {
  fail("_events/: no Event entries found");
} else {
  for (const slug of eventSlugs) {
    const event = parseFrontMatter(path.join(EVENTS_DIR, `${slug}.md`));
    if (!event) {
      fail(`_events/${slug}.md: no YAML front matter`);
      continue;
    }
    const eventPage = path.join(SITE, "events", slug, "index.html");
    if (!fs.existsSync(eventPage)) {
      fail(`events/${slug}/index.html: missing — the Event page did not build`);
      continue;
    }
    const html = fs.readFileSync(eventPage, "utf8");

    // The details block runs from the kicker to the closing of the details
    // list, so text outside the event (nav, footer) cannot satisfy checks.
    const start = html.indexOf('<p class="event-kicker">');
    const end = html.indexOf("</dl>", start);
    if (start === -1 || end === -1) {
      fail(`events/${slug}/index.html: no event details block rendered`);
      continue;
    }
    const segment = html.slice(start, end);

    if (!html.includes(`<h1 class="post-title">${escapeHtml(event.title)}</h1>`)) {
      fail(`events/${slug}/index.html: <h1> is not its title "${event.title}"`);
    }
    if (!segment.includes(`<p class="event-kicker">${escapeHtml(event.event_type)}</p>`)) {
      fail(`events/${slug}/index.html: does not render its event type "${event.event_type}"`);
    }

    // Both dates with their per-day notes (e.g. the half-day note).
    for (const day of event.days || []) {
      if (!segment.includes(`<span class="event-day">${formatEventDay(day.date)}</span>`)) {
        fail(`events/${slug}/index.html: does not show the date ${day.date} in words`);
      }
      if (day.note && !segment.includes(escapeHtml(day.note))) {
        fail(`events/${slug}/index.html: does not show the day note "${day.note}"`);
      }
    }

    if (event.venue && event.venue.name) {
      if (!segment.includes(escapeHtml(event.venue.name))) {
        fail(`events/${slug}/index.html: does not show the venue "${event.venue.name}"`);
      }
    }
    if (event.format && !segment.includes(escapeHtml(event.format))) {
      fail(`events/${slug}/index.html: does not show the format "${event.format}"`);
    }
    if (event.audience && !segment.includes(escapeHtml(event.audience))) {
      fail(`events/${slug}/index.html: does not show the audience "${event.audience}"`);
    }
    if (event.rsvp_required && !segment.includes("RSVP required")) {
      fail(`events/${slug}/index.html: does not state that RSVP is required`);
    }

    // RSVP: a real link once the URL is set, the placeholder otherwise — and
    // never a link with an empty href.
    if (event.rsvp_url) {
      if (!segment.includes(`<a class="event-rsvp-button" href="${escapeHtml(event.rsvp_url)}">RSVP</a>`)) {
        fail(`events/${slug}/index.html: RSVP button does not link ${event.rsvp_url}`);
      }
    } else if (!segment.includes('<span class="event-rsvp-button" aria-disabled="true">RSVP link coming soon</span>')) {
      fail(`events/${slug}/index.html: RSVP placeholder "RSVP link coming soon" missing`);
    }

    // Unset fields must be visibly marked TBA — counted, not blank. The venue
    // is TBA when its name is unset, the room when the venue has no room.
    const hasVenueName = Boolean(event.venue && event.venue.name);
    const hasRoom = Boolean(event.venue && event.venue.room);
    const expectedTbas =
      (hasVenueName ? (hasRoom ? 0 : 1) : 1) + (event.rsvp_deadline ? 0 : 1) + (event.agenda ? 0 : 1) + (event.travel_notes ? 0 : 1);
    const renderedTbas = (segment.match(/<span class="event-tba">TBA<\/span>/g) || []).length;
    if (renderedTbas !== expectedTbas) {
      fail(`events/${slug}/index.html: expected ${expectedTbas} TBA markers, found ${renderedTbas}`);
    }
  }

  // The index groups events into Upcoming and Past relative to the build
  // date; an event is past only once its end date has fully passed.
  const EVENTS_INDEX = path.join(SITE, "events", "index.html");
  if (!fs.existsSync(EVENTS_INDEX)) {
    fail("events/index.html: missing — the Events index did not build");
  } else {
    const indexHtml = fs.readFileSync(EVENTS_INDEX, "utf8");
    const upcomingStart = indexHtml.indexOf('<div class="event-group" id="upcoming">');
    const pastStart = indexHtml.indexOf('<div class="event-group" id="past">');
    if (upcomingStart === -1 || pastStart === -1) {
      fail("events/index.html: missing the Upcoming/Past group separation");
    } else {
      if (upcomingStart > pastStart) fail("events/index.html: the upcoming group does not precede the past group");
      const groupHtmls = {
        upcoming: extractDiv(indexHtml, upcomingStart),
        past: extractDiv(indexHtml, pastStart),
      };
      if (groupHtmls.upcoming === null || groupHtmls.past === null) {
        fail("events/index.html: an event group is not a complete div");
      } else {
        for (const slug of eventSlugs) {
          const event = parseFrontMatter(path.join(EVENTS_DIR, `${slug}.md`));
          if (!event) continue;
          const [year, month, day] = String(event.end_date).slice(0, 10).split("-").map(Number);
          const isPast = new Date(year, month - 1, day, 23, 59, 59) < new Date();
          const expectedGroup = isPast ? "past" : "upcoming";
          const cardLink = `href="${BASEURL}/events/${slug}/"`;
          if (!groupHtmls[expectedGroup].includes(cardLink)) {
            fail(`events/index.html: "${event.title}" is not listed under ${expectedGroup}`);
          }
          const otherGroup = isPast ? "upcoming" : "past";
          if (groupHtmls[otherGroup].includes(cardLink)) {
            fail(`events/index.html: "${event.title}" is also listed under ${otherGroup}`);
          }
        }

        // The All-Hands Meeting is the first seeded Event: assert its card
        // explicitly (dates, venue, format and RSVP state are visible on the
        // index, not only on the event page).
        const upcomingHtml = groupHtmls.upcoming;
        if (!upcomingHtml.includes(`href="${BASEURL}/events/${ALL_HANDS_SLUG}/"`)) {
          fail(`events/index.html: the All-Hands Meeting (${ALL_HANDS_SLUG}) is not listed under Upcoming`);
        }
      }
    }
  }
}

// 11. News: every _news/ News Item renders inline on the News page as a
// dated row, newest first — and no Event appears in the News page or the
// RSS feed (Events live only in the Events collection, issue #8).
const NEWS_PAGE = path.join(SITE, "news", "index.html");
const newsSlugs = fs
  .readdirSync(path.join(__dirname, "..", "_news"))
  .filter((name) => name.endsWith(".md"))
  .map((name) => name.replace(/\.md$/, ""));
// Matches the local news override's date format ('%b %-d, %Y').
const NEWS_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const formatNewsDate = (yamlDate) => {
  const [year, month, day] = String(yamlDate).slice(0, 10).split("-").map(Number);
  return `${NEWS_MONTHS[month - 1]} ${day}, ${year}`;
};
// Comparable plain text: strips rendered tags / markdown link syntax, folds
// kramdown's smart quotes back to straight ones, collapses whitespace.
const normalizeText = (value) =>
  value
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, "$1")
    .replace(/['’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

if (newsSlugs.length === 0) {
  fail("_news/: no News Items found");
} else {
  const newsItems = newsSlugs.map((slug) => {
    const item = parseFrontMatter(path.join(__dirname, "..", "_news", `${slug}.md`));
    if (!item) {
      fail(`_news/${slug}.md: no YAML front matter`);
      return null;
    }
    // News Items are short inline announcements rendered in the News page's
    // table; a non-inline item would need a standalone page, which the
    // collection does not build.
    if (!item.date) {
      fail(`_news/${slug}.md: News Item has no date`);
    }
    if (item.inline !== true) {
      fail(`_news/${slug}.md: News Item must be inline: true`);
    }
    return { slug, ...item };
  });

  const newsHtml = fs.existsSync(NEWS_PAGE) ? fs.readFileSync(NEWS_PAGE, "utf8") : null;
  if (!newsHtml) {
    fail("news/index.html: missing — the News page did not build");
  } else {
    const newsListHtml = extractElement(newsHtml, newsHtml.indexOf('<ul class="ideas-news-list"'), "ul");
    if (!newsListHtml) {
      fail("news/index.html: no rendered news block");
    } else {
      const newsText = normalizeText(newsListHtml);
      const renderedDates = [...newsListHtml.matchAll(/<time class="ideas-date"[^>]*>([^<]+)<\/time>/g)].map((m) => m[1].trim());

      // Newest first: the rendered date sequence is the News Items sorted by
      // date descending.
      const expectedDates = newsItems
        .filter(Boolean)
        .sort((a, b) => String(b.date).slice(0, 10).localeCompare(String(a.date).slice(0, 10)))
        .map((item) => formatNewsDate(item.date));
      const sequenceMatches = renderedDates.length === expectedDates.length && renderedDates.every((date, index) => date === expectedDates[index]);
      if (!sequenceMatches) {
        fail(
          `news/index.html: News Items are not listed newest first with dates (found ${renderedDates.join("; ")}, expected ${expectedDates.join("; ")})`
        );
      }

      for (const item of newsItems) {
        if (!item) continue;
        if (!renderedDates.includes(formatNewsDate(item.date))) {
          fail(`news/index.html: News Item _news/${item.slug}.md is not listed with its date ${formatNewsDate(item.date)}`);
        }
        const body = normalizeText(
          String(fs.readFileSync(path.join(__dirname, "..", "_news", `${item.slug}.md`), "utf8")).replace(/^---\n[\s\S]*?\n---\n/, "")
        );
        if (!newsText.includes(body)) {
          fail(`news/index.html: News Item _news/${item.slug}.md is not rendered on the News page`);
        }
      }

      // Events never appear in News: no link to an Event page and no Event
      // title inside the rendered news block (scoping to the block keeps the
      // navbar's Events link out of the check).
      if (newsListHtml.includes(`href="${BASEURL}/events/`)) {
        fail("news/index.html: the News page links to an Event");
      }
      for (const slug of eventSlugs) {
        const event = parseFrontMatter(path.join(EVENTS_DIR, `${slug}.md`));
        if (event && event.title && newsText.includes(normalizeText(escapeHtml(event.title)))) {
          fail(`news/index.html: the News page mentions the Event "${event.title}"`);
        }
      }

      // The RSS feed must not announce Events either.
      const FEED = path.join(SITE, "feed.xml");
      if (!fs.existsSync(FEED)) {
        fail("feed.xml: missing");
      } else {
        const feed = fs.readFileSync(FEED, "utf8");
        for (const slug of eventSlugs) {
          const event = parseFrontMatter(path.join(EVENTS_DIR, `${slug}.md`));
          if (!event) continue;
          if (feed.includes(`events/${slug}`)) {
            fail(`feed.xml: references the Event ${slug}`);
          }
          if (event.title && feed.includes(escapeHtml(event.title))) {
            fail(`feed.xml: announces the Event "${event.title}"`);
          }
        }
        if (feed.includes(`href="${BASEURL}/events/`)) {
          fail("feed.xml: links to an Event page");
        }
      }
    }
  }
}

// 12. Home landing page (issue #10): the hypothesis hero, Objective cards and
// Use Case cards linking into the Research/Use Cases pages, the newest News
// Items and the next upcoming Event rendered automatically from their
// collections, and the sibling-Thrust note — with TIDES mentioned only in
// that note, site-wide.
const HOME_PAGE = path.join(SITE, "index.html");
const HOME_BLOCKS_MARKER = "<!-- home-blocks -->";
const HOME_TITLE = "Intelligent Data Exploration Assistant for Science";
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// Matches the layout's date formats ("February 2", "February 3, 2027").
const parseHomeDate = (yamlDate) => {
  const [year, month, day] = String(yamlDate).slice(0, 10).split("-").map(Number);
  return { year, month: LONG_MONTHS[month - 1], day };
};
const formatHomeDay = (yamlDate) => {
  const { month, day } = parseHomeDate(yamlDate);
  return `${month} ${day}`;
};
const formatHomeFullDate = (yamlDate) => {
  const { year, month, day } = parseHomeDate(yamlDate);
  return `${month} ${day}, ${year}`;
};
// Visitor-visible markup only: script blocks (e.g. al_search's inlined
// ninja.data index) mirror other pages' content and are not page prose.
const stripScriptBlocks = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, " ");

if (!fs.existsSync(HOME_PAGE)) {
  fail("index.html: missing — the Home page did not build");
} else {
  const homeHtml = fs.readFileSync(HOME_PAGE, "utf8");

  // Hero copy and sibling-Thrust note come from _pages/about.md, split at the
  // same marker the home layout uses.
  const aboutBody = fs.readFileSync(path.join(__dirname, "..", "_pages", "about.md"), "utf8").replace(/^---\n[\s\S]*?\n---\n/, "");
  if (!aboutBody.includes(HOME_BLOCKS_MARKER)) {
    fail("_pages/about.md: no home-blocks marker to split the hero copy from the sibling-Thrust note");
  }
  const [heroCopy, siblingCopy] = aboutBody.split(HOME_BLOCKS_MARKER).map(normalizeText);

  const homeText = normalizeText(stripScriptBlocks(homeHtml));

  const heroH1 = homeHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  if (!heroH1 || heroH1[1].trim() !== HOME_TITLE) {
    fail(`index.html: hero <h1> is not "${HOME_TITLE}"`);
  }
  if (!homeText.includes(heroCopy)) {
    fail("index.html: hypothesis hero copy missing");
  }
  if (!homeText.includes(siblingCopy)) {
    fail("index.html: sibling-Thrust note missing");
  }

  // The P1 hero (issue #20): an Ink band carrying the Wordmark Hero above the
  // title and the chameleon render — both decorative (alt="") — with a filled
  // button into the Research page.
  const homeHeroHtml = extractElement(homeHtml, homeHtml.indexOf('<section class="home-hero"'), "section");
  if (!homeHeroHtml) {
    fail("index.html: no hero section");
  } else {
    const wordmarkImg = homeHeroHtml.match(/<img[^>]*ideas-wordmark-hero[^>]*>/);
    if (!wordmarkImg) {
      fail("index.html: the hero does not carry the Wordmark Hero");
    } else if (!/alt=""/.test(wordmarkImg[0])) {
      fail('index.html: the Wordmark Hero must be decorative (alt="")');
    }
    const chameleonImg = homeHeroHtml.match(/<img[^>]*chameleon-hero[^>]*>/);
    if (!chameleonImg) {
      fail("index.html: the hero does not carry the chameleon render");
    } else if (!/alt=""/.test(chameleonImg[0])) {
      fail('index.html: the chameleon render must be decorative (alt="")');
    }
    if (!homeHeroHtml.includes("DOE ASCR · Argonne Base · Thrust 2")) {
      fail("index.html: the hero is missing its kicker");
    }
    if (!homeHeroHtml.match(new RegExp(`<a\\b[^>]*class="[^"]*\\bideas-button\\b[^"]*"[^>]*href="${BASEURL}/research/"`))) {
      fail("index.html: the hero has no button into the Research page");
    }
  }

  // Objective cards: one per objective project, in importance order, linking
  // to its anchor on the Research page with title and tagline visible.
  const homeProjects = fs
    .readdirSync(projectsDir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const data = parseFrontMatter(path.join(projectsDir, name));
      return data ? { slug: name.replace(/\.md$/, ""), ...data } : null;
    })
    .filter(Boolean);
  const homeObjectives = homeProjects.filter((project) => project.category === "objective").sort((a, b) => a.importance - b.importance);
  const homeUseCases = homeProjects.filter((project) => project.category === "use-case").sort((a, b) => a.importance - b.importance);

  const homeObjectivesHtml = extractElement(homeHtml, homeHtml.indexOf('<section class="ideas-block home-objectives"'), "section");
  if (!homeObjectivesHtml) {
    fail("index.html: no Objectives block");
  } else {
    const objectiveCards = [...homeObjectivesHtml.matchAll(/<a class="ideas-card"/g)].map((match, index, all) =>
      homeObjectivesHtml.slice(match.index, index + 1 < all.length ? all[index + 1].index : homeObjectivesHtml.length)
    );
    if (objectiveCards.length !== homeObjectives.length) {
      fail(`index.html: expected ${homeObjectives.length} Objective cards, found ${objectiveCards.length}`);
    }
    homeObjectives.forEach((objective, index) => {
      const card = objectiveCards[index];
      if (!card) return;
      if (!card.includes(`href="${BASEURL}/research/#${objective.slug}"`)) {
        fail(`index.html: Objective card "${objective.title}" does not link to research/#${objective.slug}`);
      }
      if (!normalizeText(card).includes(normalizeText(escapeHtml(objective.title)))) {
        fail(`index.html: Objective card for ${objective.slug} does not show its title`);
      }
      if (!normalizeText(card).includes(normalizeText(escapeHtml(objective.tagline)))) {
        fail(`index.html: Objective card for ${objective.slug} does not show its tagline`);
      }
      // P1 (issue #20): each card is figure-led and carries the Objective's
      // own summary — authored once in the Objective's source, not a cut of
      // the Research essay.
      if (!objective.summary) {
        fail(`_projects/${objective.slug}.md: no summary — every Objective card needs one`);
        return;
      }
      if (!normalizeText(card).includes(normalizeText(escapeHtml(objective.summary)))) {
        fail(`index.html: Objective card for ${objective.slug} does not show its summary from its source`);
      }
      const cardImg = card.match(/<img[^>]*src="([^"]*)"[^>]*>/);
      if (!cardImg) {
        fail(`index.html: Objective card for ${objective.slug} has no figure`);
      } else if (objective.figure) {
        const expectedSrc = `${BASEURL}/${objective.figure.src}`;
        if (!cardImg[1].includes(expectedSrc)) {
          fail(`index.html: Objective card for ${objective.slug} does not show its figure ${objective.figure.src}`);
        }
        if (!fs.existsSync(path.join(SITE, objective.figure.src))) {
          fail(`${objective.figure.src}: not published in the build`);
        }
      }
    });
  }

  // Use Case cards: one per use-case project, Active before Upcoming (the
  // layout renders the statuses in that order), linking to the Use Cases
  // page with the status visible on the card.
  const homeUseCasesHtml = extractElement(homeHtml, homeHtml.indexOf('<section class="ideas-block home-use-cases"'), "section");
  if (!homeUseCasesHtml) {
    fail("index.html: no Use Cases block");
  } else {
    const useCaseCards = [...homeUseCasesHtml.matchAll(/<a class="ideas-card"/g)].map((match, index, all) =>
      homeUseCasesHtml.slice(match.index, index + 1 < all.length ? all[index + 1].index : homeUseCasesHtml.length)
    );
    if (useCaseCards.length !== homeUseCases.length) {
      fail(`index.html: expected ${homeUseCases.length} Use Case cards, found ${useCaseCards.length}`);
    }
    const statusOf = (project) => (project.status === "active" ? "Active" : "Upcoming");
    const sortedUseCases = [...homeUseCases].sort((a, b) => (a.status === b.status ? a.importance - b.importance : a.status === "active" ? -1 : 1));
    useCaseCards.forEach((card, index) => {
      const useCase = sortedUseCases[index];
      if (!card) return;
      if (!useCase) {
        fail("index.html: contains a Use Case card with no _projects/ entry");
        return;
      }
      if (!card.includes(`href="${BASEURL}/use-cases/#${useCase.slug}"`)) {
        fail(`index.html: Use Case card "${useCase.title}" does not link to use-cases/#${useCase.slug}`);
      }
      if (!normalizeText(card).includes(`${statusOf(useCase)} Use Case`)) {
        fail(`index.html: Use Case card for ${useCase.slug} does not show its "${statusOf(useCase)}" status`);
      }
      if (!normalizeText(card).includes(normalizeText(escapeHtml(useCase.title)))) {
        fail(`index.html: Use Case card for ${useCase.slug} does not show its title`);
      }
      // P1 (issue #20): the Home Use Case cards are figure-led. A Use Case
      // with a figure shows it; one without shows the ramp voxel tile
      // carrying its media label.
      if (useCase.figure) {
        const cardImg = card.match(/<img[^>]*src="([^"]*)"[^>]*>/);
        const expectedSrc = `${BASEURL}/${useCase.figure.src}`;
        if (!cardImg || !cardImg[1].includes(expectedSrc)) {
          fail(`index.html: Use Case card for ${useCase.slug} does not show its figure ${useCase.figure.src}`);
        }
      } else if (useCase.media_label) {
        if (!normalizeText(card).includes(normalizeText(escapeHtml(useCase.media_label)))) {
          fail(`index.html: Use Case card for ${useCase.slug} does not label its media tile "${useCase.media_label}"`);
        }
      } else {
        fail(`_projects/${useCase.slug}.md: needs a figure or a media_label for its Home card`);
      }
    });
  }

  // Latest news: the newest page.announcements.limit News Items from the
  // _news collection, newest first, with dates and inline bodies — P1's dated
  // stream (issue #20).
  const homeNewsHtml = extractElement(homeHtml, homeHtml.indexOf('<section class="ideas-block home-news"'), "section");
  if (!homeNewsHtml) {
    fail("index.html: no Latest news block");
  } else {
    const homeNewsText = normalizeText(homeNewsHtml);
    const latestNews = newsSlugs
      .map((slug) => {
        const item = parseFrontMatter(path.join(__dirname, "..", "_news", `${slug}.md`));
        return item && item.date ? { slug, ...item } : null;
      })
      .filter(Boolean)
      .sort((a, b) => String(b.date).slice(0, 10).localeCompare(String(a.date).slice(0, 10)));
    const newsLimit = 3;
    const expectedLatest = latestNews.slice(0, newsLimit);

    const homeRenderedDates = [...homeNewsHtml.matchAll(/<time class="ideas-date"[^>]*>([^<]+)<\/time>/g)].map((m) => m[1].trim());
    const expectedDates = expectedLatest.map((item) => formatNewsDate(item.date));
    if (homeRenderedDates.length !== expectedDates.length || !homeRenderedDates.every((date, index) => date === expectedDates[index])) {
      fail(
        `index.html: the Latest news block does not show the ${expectedDates.length} newest News Items newest first (found ${homeRenderedDates.join("; ")}, expected ${expectedDates.join("; ")})`
      );
    }
    for (const item of expectedLatest) {
      const body = normalizeText(
        String(fs.readFileSync(path.join(__dirname, "..", "_news", `${item.slug}.md`), "utf8")).replace(/^---\n[\s\S]*?\n---\n/, "")
      );
      if (!homeNewsText.includes(body)) {
        fail(`index.html: the Latest news block does not render News Item _news/${item.slug}.md`);
      }
    }
    // Nothing older than the limit leaks into the block.
    for (const item of latestNews.slice(newsLimit)) {
      if (homeRenderedDates.includes(formatNewsDate(item.date))) {
        fail(`index.html: the Latest news block shows more than the newest ${newsLimit} News Items`);
      }
    }
  }

  // Upcoming events: the next Event relative to the build date (same rule as
  // the Events index — past only once the end date has fully passed), linked
  // with its type, dates, venue and RSVP state visible.
  const homeEventsHtml = extractElement(homeHtml, homeHtml.indexOf('<section class="ideas-block home-events"'), "section");
  if (!homeEventsHtml) {
    fail("index.html: no Upcoming events block");
  } else {
    const homeEventsText = normalizeText(homeEventsHtml);
    const isEventPast = (event) => {
      const [year, month, day] = String(event.end_date).slice(0, 10).split("-").map(Number);
      return new Date(year, month - 1, day, 23, 59, 59) < new Date();
    };
    const nextEvent = eventSlugs
      .map((slug) => {
        const event = parseFrontMatter(path.join(EVENTS_DIR, `${slug}.md`));
        return event ? { slug, ...event } : null;
      })
      .filter((event) => event && !isEventPast(event))
      .sort((a, b) => String(a.start_date).slice(0, 10).localeCompare(String(b.start_date).slice(0, 10)))[0];

    if (!nextEvent) {
      fail("index.html: no upcoming Event in _events/ to assert against");
    } else {
      if (!homeEventsHtml.includes(`href="${BASEURL}/events/${nextEvent.slug}/"`)) {
        fail(`index.html: the Upcoming events block does not link the next Event ${nextEvent.slug}`);
      }
      if (!homeEventsText.includes(normalizeText(escapeHtml(nextEvent.event_type)))) {
        fail(`index.html: the Upcoming events block does not show the next Event's type "${nextEvent.event_type}"`);
      }
      if (!homeEventsText.includes(normalizeText(escapeHtml(nextEvent.title)))) {
        fail(`index.html: the Upcoming events block does not show the next Event's title "${nextEvent.title}"`);
      }
      if (String(nextEvent.start_date).slice(0, 10) === String(nextEvent.end_date).slice(0, 10)) {
        if (!homeEventsText.includes(formatHomeFullDate(nextEvent.start_date))) {
          fail(`index.html: the Upcoming events block does not show the next Event's date ${formatHomeFullDate(nextEvent.start_date)}`);
        }
      } else {
        if (!homeEventsText.includes(formatHomeDay(nextEvent.start_date)) || !homeEventsText.includes(formatHomeFullDate(nextEvent.end_date))) {
          fail(
            `index.html: the Upcoming events block does not show the next Event's dates ${formatHomeDay(nextEvent.start_date)} – ${formatHomeFullDate(nextEvent.end_date)}`
          );
        }
      }
      if (nextEvent.venue && nextEvent.venue.name && !homeEventsText.includes(normalizeText(escapeHtml(nextEvent.venue.name)))) {
        fail(`index.html: the Upcoming events block does not show the next Event's venue "${nextEvent.venue.name}"`);
      }
    }
  }

  // TIDES, site-wide: rendered pages mention TIDES only on the Home page, and
  // there exactly once — in the sibling-Thrust note (asserted above to be
  // present and to contain the note's copy).
  for (const file of htmlFiles) {
    const rel = path.relative(SITE, file).split(path.sep).join("/");
    if (rel === "index.html") continue;
    if (/\bTIDES\b/.test(stripScriptBlocks(fs.readFileSync(file, "utf8")))) {
      fail(`${rel}: mentions TIDES; TIDES is mentioned only in the Home page's sibling-Thrust note`);
    }
  }
  const tidesMentions = (homeText.match(/\bTIDES\b/g) || []).length;
  if (tidesMentions !== 1) {
    fail(`index.html: expected exactly one TIDES mention (the sibling-Thrust note), found ${tidesMentions}`);
  }
}

// 13. IDEAS brand palette (issue #12): the header override defines the brand
// tokens on every page — Ink text and the ramp-blue accent in light mode,
// re-pointed for dark mode (light text on Ink, sky accent, since the ramp's
// starting navy is unreadable on Ink) — and every accent/text colour meets
// WCAG AA (>= 4.5:1) against its background.
const BRAND_DECLARATIONS = [
  ["--global-bg-color", "#f7f8fb", "light-mode brand Background"],
  ["--global-text-color", "#0b1f3a", "light-mode Ink text"],
  ["--global-theme-color", "#1d4ed8", "light-mode ramp-blue accent"],
  ["--global-bg-color", "#0b1f3a", "dark-mode Ink background"],
  ["--global-theme-color", "#0ea5e9", "dark-mode sky accent"],
];
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const rel = path.relative(SITE, file).split(path.sep).join("/");
  for (const [prop, value, label] of BRAND_DECLARATIONS) {
    if (!new RegExp(`${prop}:\\s*${value}`).test(html)) {
      fail(`${rel}: missing the ${label} token (${prop}: ${value}) — the IDEAS palette is not applied`);
    }
  }
}

// The palette itself, checked against WCAG AA rather than trusted by eye:
// sRGB relative luminance and the contrast ratio, per WCAG 2.x.
const srgbLuminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};
const wcagContrast = (fg, bg) => {
  const [hi, lo] = [srgbLuminance(fg), srgbLuminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
};
const BRAND_CONTRAST_PAIRS = [
  ["#0b1f3a", "#f7f8fb", "light-mode Ink text on the Background"],
  ["#1d4ed8", "#f7f8fb", "light-mode ramp-blue accent on the Background"],
  ["#d5deea", "#0b1f3a", "dark-mode text on Ink"],
  ["#0ea5e9", "#0b1f3a", "dark-mode sky accent on Ink"],
];
for (const [fg, bg, label] of BRAND_CONTRAST_PAIRS) {
  const ratio = wcagContrast(fg, bg);
  if (ratio < 4.5) {
    fail(`brand palette (issue #12): ${label} is ${ratio.toFixed(2)}:1, below WCAG AA's 4.5:1 for text`);
  }
}

// 14. Header logo and favicons (issue #12): every page carries the Horizontal
// Lockup in both colour versions, the favicon links point at the branding
// build's Icon files, and the logo assets stay on-palette — the light lockup
// uses only Transfer-Function Ramp colours (plus the Ink tagline), and the
// dark lockup's lightened ramp start keeps every Voxel at >= 3:1 on Ink
// (WCAG 1.4.11 for non-text graphics).
const RAMP7 = ["#1e3a8a", "#1d4ed8", "#0284c7", "#0ea5e9", "#14b8a6", "#84cc16", "#f59e0b"];
const LIGHT_LOCKUP = path.join(SITE, "assets", "img", "logo", "ideas-horizontal-lockup-color-on-light.svg");
const DARK_LOCKUP = path.join(SITE, "assets", "img", "logo", "ideas-horizontal-lockup-color-on-ink-lightened.svg");
const svgColours = (svg) => [...svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{6})"/g)].map((m) => m[1].toLowerCase());

// The dark lockup is the one that renders on Ink: every Voxel colour in it
// (the white Tagline excepted) must clear 3:1 on Ink. The light lockup keeps
// the ramp as-is and an Ink Tagline, so only its palette membership is pinned.
if (fs.existsSync(DARK_LOCKUP)) {
  const darkColours = [...new Set(svgColours(fs.readFileSync(DARK_LOCKUP, "utf8")))].filter((c) => c !== "#ffffff");
  for (const c of darkColours) {
    const ratio = wcagContrast(c, "#0b1f3a");
    if (ratio < 3) {
      fail(`dark-mode header lockup: ${c} is only ${ratio.toFixed(2)}:1 on Ink — below the 3:1 (WCAG 1.4.11) needed to render crisply in dark mode`);
    }
  }
  for (const [lightened, original] of [
    ["#486ed7", "#1e3a8a"],
    ["#4c74e7", "#1d4ed8"],
  ]) {
    if (!darkColours.includes(lightened) || darkColours.includes(original)) {
      fail(`dark-mode header lockup: expected the lightened ramp start (${original} -> ${lightened}); regenerate the derivation`);
    }
  }
}

if (fs.existsSync(LIGHT_LOCKUP)) {
  const offPalette = [...new Set(svgColours(fs.readFileSync(LIGHT_LOCKUP, "utf8")))].filter((c) => c !== "#0b1f3a" && !RAMP7.includes(c));
  if (offPalette.length > 0) {
    fail(`light-mode header lockup: off-palette colours ${offPalette.join(", ")} — regenerate from the ideas-branding build`);
  }
}

if (fs.existsSync(DARK_LOCKUP)) {
  const darkColours = new Set(svgColours(fs.readFileSync(DARK_LOCKUP, "utf8")));
  for (const [lightened, original] of [
    ["#486ed7", "#1e3a8a"],
    ["#4c74e7", "#1d4ed8"],
  ]) {
    if (!darkColours.has(lightened) || darkColours.has(original)) {
      fail(`dark-mode header lockup: expected the lightened ramp start (${original} -> ${lightened}); regenerate the derivation`);
    }
  }
}

// The favicon must be the branding build's multi-size .ico (16/32/48), not a
// single-size image: parse the directory entries like an .ico reader would.
const ICO = path.join(SITE, "assets", "img", "favicon.ico");
if (!fs.existsSync(ICO)) {
  fail("favicon.ico missing from the build output (assets/img/favicon.ico)");
} else {
  const ico = fs.readFileSync(ICO);
  const sizes = [];
  for (let i = 0; i < ico.readUInt16LE(4); i++) {
    const w = ico[6 + i * 16] || 256;
    const h = ico[7 + i * 16] || 256;
    if (w === h) sizes.push(w);
  }
  const expected = [16, 32, 48];
  if (JSON.stringify(sizes) !== JSON.stringify(expected)) {
    fail(`favicon.ico contains ${sizes.join("/")}px images, expected ${expected.join("/")}px (the ideas-branding build's set)`);
  }
}

// 15. P1 site design (issue #20): every page loads the P1 type families —
// Inter for headings and body text, JetBrains Mono for labels and dates —
// through the theme's Google Fonts link, re-pointed in _config.yml.
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const rel = path.relative(SITE, file);
  const fontsLink = html.match(/href="(https:\/\/fonts\.googleapis\.com\/css2[^"]*)"/);
  if (!fontsLink) {
    fail(`${rel}: no Google Fonts stylesheet link for the P1 type families`);
    continue;
  }
  if (!/family=Inter\b/.test(fontsLink[1])) fail(`${rel}: the P1 sans (Inter) is not loaded`);
  if (!/family=JetBrains\+Mono\b/.test(fontsLink[1])) fail(`${rel}: the P1 mono (JetBrains Mono) is not loaded`);
}

// The phone grid renders the same Partner logos byte for byte from their own
// files; they must be published.
const PARTNER_LOGOS = ["argonne", "ucdavis", "cincinnati", "uic", "unl", "kitware", "veeda"];
for (const partner of PARTNER_LOGOS) {
  if (!fs.existsSync(path.join(SITE, "assets", "img", "logos", "partners", `${partner}.svg`))) {
    fail(`assets/img/logos/partners/${partner}.svg: not published in the build`);
  }
}

if (failures.length > 0) {
  console.error(`Site assertions FAILED (${failures.length}):`);
  for (const f of [...new Set(failures)]) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`Site assertions passed over ${htmlFiles.length} pages.`);

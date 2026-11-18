# IDEAS Project Website

Public website for **IDEAS** (Intelligent Data Exploration Assistant for Science), the visualization Thrust of the DOE ASCR Argonne Base program. Built on the [al-folio](https://github.com/alshedivat/al-folio) Jekyll template (see [docs/adr/0001](docs/adr/0001-al-folio-as-site-template.md)), deployed to GitHub Pages at <https://mvictoras.github.io/www-ideas/> by GitHub Actions.

This guide is for **Team Members** who maintain the site by editing Markdown and BibTeX and opening pull requests — no web-development expertise needed. Project vocabulary (Team Member, Software Release, News Item, Event, All-Hands Meeting, …) is defined in [`CONTEXT.md`](CONTEXT.md); this guide uses those terms throughout.

## Local setup and preview

You need Ruby 3.3 (via [rbenv](https://github.com/rbenv/rbenv)), Node.js 20, and ImageMagick.

```sh
brew install rbenv imagemagick   # macOS; rbenv: also add its init lines to your shell profile
rbenv install 3.3.0 && rbenv local 3.3.0
```

Then, from the repository root:

```sh
npm install        # JS dev dependencies (Prettier, test harness)
bundle install     # Ruby gems (Jekyll and the al_* theme gems)
bundle exec jekyll serve
```

Preview the site at **<http://127.0.0.1:4000/www-ideas/>** — note the `/www-ideas/` base path, which is configured in `_config.yml` to match the GitHub Pages deployment. Jekyll regenerates the site as you edit; refresh the browser to see changes.

Before pushing, run the same checks CI runs:

```sh
npx prettier . --check   # formatting; fix with npx prettier . --write
./bin/cibuild            # full production build + test harness
```

## Adding content

Every change goes through a pull request. CI must pass before your change is deployed.

### Add or edit a Team Member

Team Members live in `_data/team.yml`, one YAML entry per person, rendered as a single grid on the Team page. Append an entry:

```yaml
- name: Jane Doe
  role: Postdoctoral Appointee
  institution: Argonne National Laboratory
  photo: jane-doe.jpg # optional; file in assets/img/team/
  publication_name_aliases: # optional; names she publishes under that
    - Jane Q. Doe #   differ from `name` (for bolding in Publications)
  links: # optional; only the types present are rendered
    homepage: https://example.com
    orcid: https://orcid.org/0000-0000-0000-0000
    scholar: https://scholar.google.com/citations?user=...
    github: https://github.com/janedoe
```

- The file's own comments document every field — keep the entry alphabetical by nothing in particular; order in the file is order on the page.
- If you have a headshot, add it as `assets/img/team/<photo filename>` (a square JPG works best). Without a photo, an initials avatar is shown automatically.
- Names in `publication_name_aliases` (and the card `name` itself) are bolded automatically in author lists on the Publications page — you don't touch `_bibliography/papers.bib` for that.

### Add a publication

Publications come from a single BibTeX file, `_bibliography/papers.bib`, rendered on the Publications page grouped by year. Append an entry:

```bibtex
@inproceedings{doe2027example,
  title     = {An Example Paper},
  author    = {Doe, Jane and Mateevitsi, Victor A.},
  booktitle = {Example Conference 2027},
  year      = {2027},
  doi       = {10.1234/example.doi},
  bibtex_show = {true},
  abstract  = {
    Optional abstract text. Shows an "Abs" toggle on the page and is
    excluded from the BibTeX export.
  }
}
```

- `bibtex_show = {true}` shows the "Bib" export button; `doi` becomes a <https://doi.org/…> link; `note` can mark a pre-print.
- Copy the citation from the publisher where possible (most offer BibTeX export) and trim it to the fields above.
- Team Member names are bolded automatically from `_data/team.yml` — no extra markup.

### Add a Software Release

Software Releases live in `_data/software.yml`, one structured entry per publicly available tool, rendered as cards on the Software page:

```yaml
- name: Example Tool
  description: One-line description of what the tool does
  repository: https://github.com/org/example-tool
  paper_doi: 10.1234/example.doi # optional; links the related paper
  project_page: https://example.org/tool # optional
```

### Add a News Item

A News Item is a short dated announcement of something that **has happened** (a paper published, a software released). Create a file in `_news/` named after the item, e.g. `_news/example-paper-published.md`:

```markdown
---
inline: true
date: 2027-03-15
---

Our paper [An Example Paper](https://doi.org/10.1234/example.doi) by Jane Doe appeared at Example Conference 2027.
```

- `inline: true` keeps the item a one-line dated row on the News page (and in search) rather than a full blog post — keep the body to one or two sentences, with links.
- News Items and Events are kept strictly separate: never announce an upcoming gathering as a News Item, and never put an accomplishment on the Events page.

### Add an Event (including the All-Hands Meeting)

An Event is a dated gathering with a place and format that people attend. Events live in the `_events/` collection, one Markdown file each; each gets its own page and appears in the Events index under **Upcoming** or **Past** automatically (based on its end date and the build date).

Copy `_events/all-hands-2027.md` as a starting point and fill in what you know:

```markdown
---
title: "IDEAS All-Hands Meeting"
description: >-
  One-sentence summary shown on the index.
event_type: All-Hands Meeting
start_date: 2028-02-01
end_date: 2028-02-02
days:
  - date: 2028-02-01
    note: Full day
  - date: 2028-02-02
    note: Half day, to allow for travel
venue:
  name: Argonne National Laboratory
  room: ""
format: In person
audience: Invite-only — all IDEAS participants, including Partners
rsvp_required: true
rsvp_url: ""
rsvp_deadline:
agenda:
travel_notes:
---

Optional prose shown on the event page.
```

Details for the **All-Hands Meeting** (or any Event) are filled in later by editing the structured fields in its file — no HTML:

- **Venue**: set `venue.name` and `venue.room`.
- **Agenda**: set `agenda` (YAML list of items, or free text).
- **RSVP**: set `rsvp_url` to the Google Form URL. While `rsvp_url` is empty, the page shows a disabled "RSVP link coming soon" button; once set, a prominent RSVP button appears. Set `rsvp_deadline` when known.
- **Travel**: set `travel_notes`.

Any field you leave unset renders as a visible **TBA** marker on the page — so a partial Event page never looks broken, just honest about what's pending.

## What CI checks, and how to read a failure

Two workflows run on every pull request:

1. **Prettier** (`.github/workflows/prettier.yml`) — checks formatting of all files. If it fails, run `npx prettier . --write` locally and push; the check log links an HTML diff artifact showing exactly what was misformatted.
2. **Deploy site** (`.github/workflows/deploy.yml`) — runs `./bin/cibuild`: a production build with the `/www-ideas/` base path, then three test layers over the build output. Merges to `main` deploy automatically only if this passes.

The three test layers, in the order `./bin/cibuild` runs them:

1. **The build itself + plugin-tag check** (`test/check_build_output.js`) — the Jekyll build must succeed, no page may contain Liquid error text or unrendered template syntax, and plugin-driven surfaces (like the search index) must not be silently empty. A failure here is usually a YAML/BibTeX syntax error or a typo in a Liquid file; the Jekyll build output above the failure names the file and line.
2. **HTML assertions** (`test/assert_site.js`) — asserts visitor-visible behaviour of the built pages: every nav page exists with one heading, the Team grid matches `_data/team.yml` 1:1, every BibTeX entry renders with Team Member names bolded, Software cards match `_data/software.yml`, the All-Hands Meeting page shows its dates and RSVP state, no Event appears in News, the footer carries the ASCR acknowledgment, and no email address or analytics appears anywhere. Failure messages name the page and the exact expectation, e.g. `team/index.html: "Jane Doe" card does not render role "Postdoctoral Appointee"` — check the corresponding data file for a typo.
3. **html-proofer** — internal links, images and anchors must resolve under the base path. A failure names the built page and the broken link; usually a mistyped path or a missing asset.

Run the full harness locally with `./bin/cibuild` before pushing — it fails the same way CI does.

## Upgrading al-folio

The theme is vendored as exact-pinned `al_*` gems (see ADR-0001), so upgrades are **pin bumps plus an overrides audit** — Git won't flag upstream changes to the files we shadow.

1. Bump the pins in `Gemfile` (e.g. `gem 'al_folio_core', '= 1.0.15'` → the new version; the pins are listed under `group :al_folio_plugins`).
2. `bundle install` to fetch the new gems.
3. Re-run the overrides audit, which compares our local overrides of `al_folio_core` files against the new gem version:

   ```sh
   bundle exec al-folio upgrade overrides audit
   ```

   For every shadowed file that changed upstream, review the diff and accept the new upstream hash:

   ```sh
   bundle exec al-folio upgrade overrides accept _includes/footer.liquid
   ```

   Current overrides (recorded in `.al-folio-overrides.yml`): `_includes/header.liquid` (text wordmark navbar), `_includes/footer.liquid` (IDEAS funding footer) and `_layouts/bib.liquid` (Team Member bolding plus volume/issue/pages). After **any** change to a shadowed file — not just upgrades — re-run the audit and accept.

4. `./bin/cibuild` to confirm the upgraded theme still passes all checks, then open the upgrade as a pull request.

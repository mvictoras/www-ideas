# al-folio as the site template

We built the IDEAS site on al-folio (Jekyll) rather than a research-group template, because it is the only actively maintained option with native BibTeX publications (jekyll-scholar) and it was the maintainer's preferred look. al-folio is designed for one person's academic site, so the project-specific pages (landing page, single Team grid, Events, Software) are local `_layouts`/`_includes` overrides of `al_folio_core` gem files, tracked with `bundle exec al-folio upgrade overrides audit`.

## Considered Options

- **Greene Lab lab-website-template**: better structured team pages and per-PR preview sites, but no BibTeX support (citations come from DOI/ORCID via Manubot).
- **Hugo Blox "Research Group"**: native team and event types, but the starter was stale (last commit Oct 2024) and built on an archived framework.

## Consequences

- al-folio v1 splits the theme into exact-pinned `al_*` gems; upgrading means bumping the pins and re-running the overrides audit, since Git won't flag upstream changes to files we shadow.
- No per-PR previews out of the box; contributors preview locally with `bundle exec jekyll serve`.

## Local overrides

Local files that shadow `al_folio_core` gem files are recorded in
`.al-folio-overrides.yml` via the overrides audit:

```sh
bundle exec al-folio upgrade overrides audit
bundle exec al-folio upgrade overrides accept _includes/footer.liquid
```

Current overrides:

- `_includes/header.liquid` — the site title is the text wordmark, so the
  navbar brand renders on every page (al-folio hides it on the home page for a
  personal profile layout); navbar social icons dropped.
- `_includes/footer.liquid` — IDEAS funding footer (DOE Office of Science ASCR
  acknowledgment with contract DE-AC02-06CH11357, Argonne and DOE Office of
  Science logos, no contact email) replacing the theme's personal footer.

After any change to a shadowed file (and after every gem version bump), re-run
the audit and `accept` the new upstream hash.

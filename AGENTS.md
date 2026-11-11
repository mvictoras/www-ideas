# IDEAS Project Website

Public website for IDEAS (Intelligent Data Exploration Assistant for Science),
a thrust of the DOE ASCR Argonne Base program.

## Test harness

The single test seam is the production build output. Run everything with:

```sh
./bin/cibuild
```

This builds the site (JEKYLL_ENV=production, base path `/www-ideas`), then runs
`test/check_build_output.js` (no Liquid errors / empty plugin-tag output) and
`test/assert_site.js` (nav pages, footer acknowledgment, no email/analytics),
then html-proofer over `_site`. The deploy workflow (`.github/workflows/deploy.yml`)
runs the same harness before publishing; a failing check blocks deploy.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

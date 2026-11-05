# Fullsend — AI Review for odh-dashboard

## Overview

Fullsend is the **review-of-record** for all non-draft PRs in this repo.
It posts a single sticky review that aggregates findings from multiple
dimensions, including CodeRabbit CLI findings (deduped and challenged).

## Coexistence with CodeRabbit

CodeRabbit (the org-wide GitHub App) is **not** a peer reviewer here.
Its auto-review is disabled to avoid duplicate review noise.

### What still works

- **CLI findings** — active via the Fullsend adapter
  (`coderabbit review --agent --deep --remote`)
- **Chat commands** — `@coderabbitai` works for ad-hoc queries
- **On-demand pre-merge checks** — `@coderabbitai run pre-merge checks`

### What is disabled

- **Auto-review comments** — no review body or inline comments from
  CodeRabbit on PRs
- **Automatic pre-merge checks** — coupled with auto-review in
  CodeRabbit, cannot be split. These were warning-only and not gating.
  Migration to Fullsend check:* producers is tracked separately.

### Architecture

```
PR opened/updated (non-draft)
       |
       +--> Fullsend (review-of-record)
       |       +-- CodeRabbit CLI adapter (.fullsend/scripts/)
       |       +-- Other dimensions (.fullsend/dimensions.json)
       |       +-- Posts single sticky review
       |
       +--> CodeRabbit App (auto-review: DISABLED)
               +-- No review comments posted
               +-- Chat commands still work on-demand
```

### Config reference

- `.coderabbit.yaml` — repo-level CodeRabbit config (auto-review disabled)
- `.fullsend/config.yaml` — Fullsend roles, runtime, model
- `.fullsend/dimensions.json` — dimensions including CodeRabbit CLI adapter
- `.fullsend/scripts/fetch-coderabbit-context.sh` — CLI adapter script
- Org baseline: `opendatahub-io/coderabbit/.coderabbit.yaml`
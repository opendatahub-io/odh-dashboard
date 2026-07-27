# Prototype Reading Skills

Optional tools for extracting PatternFly component details from RHOAI UX prototype forks. These supplement — not replace — the designer's intent communicated through Jira tickets, Figma designs, and conversations.

## What prototypes are (and aren't)

Prototypes are **communication tools** built by UX designers to demonstrate interaction patterns, layout, and flow. They are _not_ the source of truth for what to build. The source of truth is the **designer's intent**, captured in:

- Jira ticket descriptions and acceptance criteria
- Figma designs and annotations
- Refinement discussions and Slack threads
- UX review feedback

Prototypes are valuable for one specific thing: they contain **real PatternFly component usage** — exact props, layout patterns, and state management — that's tedious to extract manually from screenshots. These skills automate that extraction.

## When to use these skills

| Situation | Use |
|-----------|-----|
| Jira ticket exists, prototype exists, you need PF component details | `/prototype-spec --ticket` |
| Jira ticket exists, no prototype | Don't need these skills — implement from the ticket + Figma |
| Prototype exists, no Jira tickets yet | `/prototype-tickets` to draft tickets, but write ACs from designer intent, not prototype mechanics |
| Quick question about a specific component in the prototype | Just read the fork TSX directly — no skill needed |

## Prerequisites

- **Red Hat VPN** — prototypes (`*.pages.redhat.com`) and GitLab (`gitlab.cee.redhat.com`) are internal
- **SSH key for GitLab** — `ssh -T git@gitlab.cee.redhat.com` must succeed
- **Atlassian MCP** — connected to `redhat.atlassian.net` for Jira access

## Skills

### `/prototype-spec` — Extract PF component details for a ticket

Reads a prototype fork scoped to a specific Jira ticket. Useful when you have a ticket and want to know exactly which PF components, props, and patterns the designer used.

```bash
/prototype-spec <prototype-url> --fork <ssh-url> --ticket RHOAIENG-XXXXX [--base 3.5]
```

**What it produces:**
- Exact JSX snippets from the prototype for each UI element in scope
- Mapping to odh-dashboard wrapper components and conventions
- PF token translations (prototype uses `--pf-v6-*`, dashboard uses `--pf-t--*`)
- Files to create/modify in odh-dashboard
- Implementation warnings (wrong PF usage, inline styles, deprecated APIs)
- Testing guidance (unit test + Cypress mock test locations)

**What it does NOT produce:** the specification of what to build. That comes from the Jira ticket ACs and designer intent. The spec tells you _how_ to build what the ticket already describes.

**Epic mode:** `--epic RHOAIENG-XXXXX` produces a scope matrix across all child tickets + a phased execution plan for parallel implementation.

### `/prototype-tickets` — Draft Jira tickets from a prototype

Reads a prototype fork and proposes Jira tickets based on the interactive flows it finds. Useful during refinement when breaking down a feature area into stories.

```bash
/prototype-tickets <prototype-url> --fork <ssh-url> [--parent RHAISTRAT-XXXXX] [--base 3.5]
```

**Important:** The proposed tickets are a _starting point_, not a final breakdown. Always review and adjust:
- ACs should reflect designer intent, not prototype implementation details
- Ticket scope should match team capacity and sprint planning
- Dependencies should reflect real sequencing needs

**When tickets already exist:** Detects the existing Epic and switches to review mode — audits existing ACs against the current prototype state.

## The `--base` flag

The upstream prototype repo can move its default branch (e.g., `3.5` → `3.6`) after a designer forks. If the fork is based on `3.5` but upstream HEAD is now `3.6`, the diff includes all upstream changes between versions — not just the designer's work.

`--base 3.5` tells the skill to diff against `upstream/3.5` instead. If omitted, the skill auto-detects the correct base via `git merge-base` distance (picks the upstream branch closest to the fork HEAD).

## How to find the fork URL

1. Go to https://gitlab.cee.redhat.com/uxd/prototypes/rhoai/-/forks
2. Find the designer's fork (e.g., `ralombar/rhoai-rachel`)
3. Copy the SSH clone URL

## Architecture

| Component | Location | Purpose |
|-----------|----------|---------|
| `/prototype-spec` | `.claude/skills/prototype-spec/` | PF component extraction |
| `/prototype-tickets` | `.claude/skills/prototype-tickets/` | Ticket drafting |
| Shared fork ops | `.claude/rules/prototype-fork-ops.md` | Git clone, upstream detection, Jira error handling |
| Fork cache | `~/.cache/rhoai-prototype-reader/forks/` | Cached designer forks (per-designer directories) |

## Jira safety

All Jira write operations require explicit user confirmation:
- Ticket creation: full preview shown before any writes
- Ticket updates (review mode): exact diff shown per ticket, user confirms each
- No ticket deletion or closure — recommended as manual action only

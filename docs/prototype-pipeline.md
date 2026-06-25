# Prototype-to-Code Pipeline

Automated workflow for implementing UX prototype designs in odh-dashboard. Replaces the manual screenshot-based approach with source-level prototype analysis.

## Problem

Developers get a Jira ticket + prototype URL from UX designers. The old workflow: take 20-30 screenshots, paste into an AI agent, agent guesses which PF components to use. Result: wrong components, custom CSS instead of PF props, missed edge cases, hours of rework.

## Solution

Three skills form a pipeline that reads prototype source code directly:

```
Designer creates prototype fork on GitLab
                    │
                    ▼
    ┌───────────────────────────────┐
    │  /prototype-tickets           │  Reads fork diff + strategy ticket
    │  Creates Jira Epic + children │  Splits by feature area + interactive flow
    │  with scoped ACs              │  Previews → user approves → creates in Jira
    └───────────────┬───────────────┘
                    │ ticket key
                    ▼
    ┌───────────────────────────────┐
    │  /prototype-spec              │  Reads fork TSX + Jira ticket ACs
    │  Produces implementation spec │  Scopes to one ticket (sibling-aware)
    │  with PF design references    │  Extracts exact PF components + props
    └───────────────┬───────────────┘
                    │ spec
                    ▼
    ┌───────────────────────────────┐
    │  Developer or agent           │  The spec is detailed enough
    │  implements from the spec     │  to code from directly
    └───────────────────────────────┘
```

## Prerequisites

- **Red Hat VPN** — prototypes (`*.pages.redhat.com`) and GitLab (`gitlab.cee.redhat.com`) are internal
- **SSH key for GitLab** — `ssh -T git@gitlab.cee.redhat.com` must succeed
- **Atlassian MCP** — connected to `redhat.atlassian.net` for Jira access

## Skills

### `/prototype-tickets` — Create Jira tickets from a prototype

Reads a prototype fork, identifies features and interactive flows, and creates a Jira Epic with properly scoped child tickets.

```bash
/prototype-tickets <prototype-url> --fork <ssh-url> [--project RHOAIENG] [--parent RHAISTRAT-XXXXX]
```

**What it does:**
1. Reads the `--parent` ticket for PM/strategy context
2. Clones the designer's fork, diffs against upstream
3. Groups changed files by feature area
4. Reads TSX source to identify interactive units (forms, tables, modals, wizards)
5. Splits into ticket proposals with ACs derived from prototype scenarios
6. Deduplicates against existing tickets (prevents duplicates on re-runs)
7. **Previews the full breakdown** — user must approve before any Jira writes
8. Creates Epic + child Stories/Tasks with dependency links

**When an Epic already exists:** If the prototype already has tickets, the skill switches to **review mode** — audits existing ticket ACs against the current prototype and proposes updates.

### `/prototype-spec` — Generate implementation spec for one ticket

Reads a prototype fork scoped to a specific Jira ticket and produces an implementation-ready build guide.

```bash
/prototype-spec <prototype-url> --fork <ssh-url> --ticket RHOAIENG-XXXXX
```

**What it does:**
1. Reads the Jira ticket + discovers sibling tickets for accurate scoping
2. Clones the fork, reads TSX source in the relevant area
3. Scopes to the ticket using rendering ownership and prerequisite gate tests
4. Extracts exact PF component trees, props, scenarios, mock data shapes
5. Finds matching patterns in odh-dashboard (wrappers, hooks, conventions)
6. Reviews the design against PF v6 guidelines
7. Produces a spec with: Design Reference (exact JSX snippets), file map, testing guidance, implementation warnings, designer questions

**Output sections:** Summary table, Ticket Scope (IN/OUT), Related Tickets, Design Reference, Feature Patterns, Scenarios, Files to Create/Modify, Implementation Warnings, Questions for Designer, Testing Guidance.

## Typical Workflow

### Starting a new feature from a prototype

```bash
# 1. Create tickets from the prototype
/prototype-tickets https://rhoai-rachel-64723e.pages.redhat.com/settings/api-keys \
  --fork git@gitlab.cee.redhat.com:designer/rhoai.git \
  --parent RHAISTRAT-1234

# 2. Get implementation spec for one ticket
/prototype-spec https://rhoai-rachel-64723e.pages.redhat.com/settings/api-keys \
  --fork git@gitlab.cee.redhat.com:designer/rhoai.git \
  --ticket RHOAIENG-56789

# 3. Implement (say "implement this" after reviewing the spec)
```

### When tickets already exist

Run `/prototype-tickets` — it detects the existing Epic and switches to review mode, checking if ACs are still accurate against the current prototype.

### When the prototype is updated

Re-run `/prototype-spec` with the same args — it reads the latest fork state and produces an updated spec.

## How to Find the Fork URL

1. Go to https://gitlab.cee.redhat.com/uxd/prototypes/rhoai/-/forks
2. Find the designer's fork (e.g., `ralombar/rhoai-rachel`)
3. Copy the SSH clone URL

The prototype URL (e.g., `https://rhoai-rachel-64723e.pages.redhat.com/...`) is the deployed version — the fork is the source code behind it.

## Architecture

| Component | Location | Purpose |
|-----------|----------|---------|
| `/prototype-tickets` | `.claude/commands/prototype-tickets.md` | Ticket creation skill |
| `/prototype-spec` | `.claude/commands/prototype-spec.md` | Spec generation skill |
| Shared fork ops | `.claude/rules/prototype-fork-ops.md` | Git clone, upstream detection, Jira error handling |
| CLI engine | `gitlab.cee.redhat.com:juntwang/rhoai-prototype-reader` | Fast diff scan (`read-design`), DOM extraction (`read-page`), PF validation — used by both skills |
| Fork cache | `~/.cache/rhoai-prototype-reader/forks/` | Cached designer forks |

## Jira Safety

All Jira write operations require explicit user confirmation:
- Ticket creation: full preview shown before any `createJiraIssue` calls
- Ticket updates (review mode): exact diff shown per ticket, user confirms each
- Dependency links: only created for successfully created tickets
- No ticket deletion or closure — recommended as manual action only
- Safety cap: warns if >15 tickets proposed in one batch

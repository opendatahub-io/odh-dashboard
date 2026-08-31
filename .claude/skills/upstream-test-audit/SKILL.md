---
name: upstream-test-audit
description: "Fetch all cypress_found_bug issues, run upstream-test-recommender analysis on each, and generate a self-contained HTML report with SVG charts, per-repo analysis, and prioritized recommendations."
argument-hint: "[--since Nd] [--team <team-name>] [--top N]"
---

# Upstream Test Audit

Batch analysis skill that fetches all `cypress_found_bug` issues from Jira, classifies them, audits the upstream repos, and produces a self-contained HTML executive report.

**This skill orchestrates `/upstream-test-recommender` at scale.** Read the recommender's [`SKILL.md`](../upstream-test-recommender/SKILL.md) and [`repo-profiles.md`](../upstream-test-recommender/repo-profiles.md) before running.

## Arguments

`$ARGUMENTS` — optional filters:
- `--since Nd` — only analyze issues created in the last N days (default: all time)
- `--team <name>` — filter to a specific component team (e.g., `maas`, `kserve`, `feast`)
- `--top N` — only analyze the top N issues by priority (default: all)
- `--parity` — include backend/frontend test parity analysis
- Empty — full audit of all `cypress_found_bug` issues

If no arguments are provided, run the full audit.

```
Usage: /upstream-test-audit [--since Nd] [--team <team-name>] [--top N] [--parity]

Examples:
  /upstream-test-audit
  /upstream-test-audit --since 90d
  /upstream-test-audit --team maas
  /upstream-test-audit --top 20 --since 180d
  /upstream-test-audit --parity
```

## Prerequisites

- **Jira access** — mcp-atlassian MCP or env vars or `~/.cursor/mcp.json` credentials
- **GitHub access** — `gh` CLI for cloning upstream repos
- **Go** — for test infrastructure auditing
- **python3** — for data processing and chart generation

## Execution

### Step 1: Fetch all cypress_found_bug issues

Query Jira for all issues with the `cypress_found_bug` label. Use pagination to get every issue.

```bash
# Use Jira REST API v3 with cursor-based pagination
JQL="project = RHOAIENG AND labels = cypress_found_bug ORDER BY created DESC"
```

Apply `--since` filter if provided (append `AND created >= -Nd` to JQL).

Save raw results to `/tmp/cypress_found_bugs.json`.

### Step 2: Classify and filter

Classify each issue into categories:
- **Upstream component bug** — keep for analysis
- **Dashboard product bug** — exclude (note count)
- **Test infrastructure** — exclude (note count)
- **Build/DevOps** — exclude (note count)

Use the classification rules from the recommender skill:
- Match keywords in summary/labels for category
- Match component teams using `repo-profiles.md`

Save classified data to `/tmp/cypress_classified.json`.

### Step 3: Per-repo audit (parallel where possible)

For each unique upstream repo identified:

1. Clone/update the repo (see recommender Step 4)
2. Run the test infrastructure audit (see recommender Step 5)
3. Record findings

Cache audit results to `~/.cache/upstream-test-recommender/audits/<org>/<repo>.json` to avoid re-auditing on subsequent runs.

### Step 4: Generate per-bug recommendations

For the top bugs (by priority, then recency), generate a recommendation using the recommender's Step 6-7 logic. Do NOT clone and audit repos one-by-one — use the cached audit from Step 3.

For large datasets (100+ issues), generate detailed recommendations for the top 30 and summary-only for the rest.

### Step 5: Generate the HTML report

Write a self-contained HTML file (inline CSS, inline SVG charts) to `.agentready/Dashboard Integration Gap Analysis.html`.

**Report structure:**

1. **Header** — title, date, author, status, related Jira links
2. **Executive summary** — stat cards (total upstream bugs, % Blocker+Critical, # teams, avg bugs/month)
3. **Visual breakdown** — SVG charts:
   - Pie chart: bugs by component team
   - Bar chart: monthly trend (last 12-18 months)
   - Bar chart: priority distribution
   - Bar chart: top fix versions
4. **Component team responsibility table** — team, bug count, %, highest severity, repos, example keys
5. **Per-component gap analysis** — envtest presence, real RBAC, CI, early-gate, key gap, recommended fix
6. **E2E → backend test parity** — which Cypress tests validate upstream behavior with no upstream backend test (if `--parity` flag)
7. **Bug reclassification table** — each bug with detection layer, confidence, why not caught
8. **AI Factory connection** — how this connects to the AI Factory initiative
9. **Full upstream bug list** — all bugs with key, summary, team, priority, created, fix version

**Styling requirements:**
- Dark/light mode support via CSS `prefers-color-scheme`
- Stat cards with colored numbers (red/amber/green/blue)
- Badges for severity/status
- Responsive SVG charts using viewBox
- Accessible color palette for charts
- No external dependencies — everything inline

### Step 6: Report summary

After generating the report, print a summary:

```
Upstream Test Audit Complete
═══════════════════════════

Total cypress_found_bug issues: N
Upstream component bugs: N (N% of total)
Excluded: N dashboard, N test-infra, N build/devops

Top 3 teams:
  1. KServe / Model Serving — N bugs
  2. MaaS / Kuadrant — N bugs
  3. AI Core Platform — N bugs

N% Blocker+Critical priority
N% catchable at operator-startup/envtest layer

Report: .agentready/Dashboard Integration Gap Analysis.html
```

## Context Management

This skill processes many issues. Follow these rules to avoid context exhaustion:

1. **Fetch issue list with minimal fields** — key, summary, priority, labels, created, fixVersions only
2. **Process in batches** — classify all issues first, then audit repos, then generate recommendations
3. **Write to disk incrementally** — don't hold all data in context
4. **Cache aggressively** — repo audits, classification results

## Error Handling

- **Jira not accessible** → Print setup instructions (same as recommender)
- **Too many issues** → Apply `--top 50` automatically if > 200 issues
- **Repo clone fails** → Skip that repo, note in report
- **Chart generation fails** → Fall back to table-only output

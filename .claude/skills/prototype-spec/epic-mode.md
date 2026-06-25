# Epic Mode — Steps 7b through 9

**These steps only run in epic mode** (`--epic`).

**Epic-level output** = scope matrix + shared contract + execution plan. Per-ticket specs are generated on demand via **"show briefing for [KEY]"** — not dumped all at once.

## Step 7b: Scope matrix

Present a matrix: every prototype element assigned to exactly one ticket. No gaps, no overlaps.

```text
| Prototype element    | [KEY-1] | [KEY-2] | [KEY-3] | ... |
|---------------------|---------|---------|---------|-----|
| [element]            | IN      | —       | —       |     |
| [element]            | —       | IN      | —       |     |
```

Ask the developer to confirm before proceeding:
> Does this scope split look right? You can move elements between tickets.

## Step 8: Dependency analysis

Build a dependency graph from:
1. **Explicit** — ticket descriptions saying "Depends on: [KEY]"
2. **Inferred from scoping** — OUT-of-scope referencing another ticket means dependency
3. **File overlap** — infrastructure (types, hooks) goes first
4. **Type ordering** — Tasks before Stories

Topological sort → group into phases. Within a phase, tickets run in parallel.

**Soft dependencies:** If ticket A "depends on" B but A's component can be built standalone and wired in after merge, they CAN be in the same phase. Note the rationale. Only when clean interface boundary (props in, callbacks out).

## Step 9: Briefing packages + execution plan

### Per-agent briefing (3 layers)

**Layer 1 — Shared contract** (~80 lines, identical for all):
- Exact type definitions from infrastructure task
- File ownership map (one line per ticket: which files it owns)
- Interface contracts (how data flows between tickets)
- Common utility import paths (`useFetchState`, `SimpleSelect`, project types, etc.)

**Layer 2 — Boundary summary** (~30 lines, identical for all):
```text
SIBLINGS — do not implement, for awareness only:
- [KEY-1] (Task): [what it builds, files it owns]
- [KEY-2] (Story): [summary] ← THIS IS YOU
```

**Layer 3 — Full ticket spec** (~300 lines, unique per agent):
Same format as ticket mode — Design Reference, scenarios, files, testing guidance.

**Total: ~410 lines per agent.**

### Execution plan

```text
Phase 1 — [label] (no dependencies)
  [Type] [KEY]: [summary] → Can start immediately

Phase 2 — [label] (depends on Phase 1)
  [Type] [KEY-A]: [summary]  ← parallel
  [Type] [KEY-B]: [summary]  ← parallel

Phase 3 — [label] (depends on Phase 2)
  [Type] [KEY-C]: [summary]
```

### Phase execution

> **Ready to implement.** You can:
> - **"run phase 1"** — spawn agent(s)
> - **"run phase 2"** — spawn parallel agents in worktrees
> - **"run all"** — all phases sequentially (pausing between each)
> - **"show briefing for [KEY]"** — preview before spawning
> - **"adjust [KEY] ownership of [file]"** — move file ownership

### Phase handoff rules

- Phase 1 commits before Phase 2 starts
- Phase 2 agents see Phase 1's REAL committed code — the shared contract is a PLAN that actual code replaces
- Parallel agents use `isolation: "worktree"` on the Agent tool
- Main session merges worktrees between phases
- **Even with "run all", pause between phases** — show results, wait for approval
- Developer reviews each phase's output before the next

### Partial failure

If one agent fails while others succeed:
- Report which failed and why
- Offer: "retry [KEY]", "skip and proceed", or "stop here"
- Never auto-proceed

### Agent briefing rules

- "run phase N" **automatically generates** the full Layer 3 briefing — developer does NOT need to say "show briefing" first
- "show briefing for [KEY]" is optional preview — useful but not required
- Briefing must include: "Do not modify Jira. Do not modify files owned by other tickets. Focus only on your ticket's spec."

### When is epic mode worth it?

- **3+ active tickets** with prototype coverage → use `--epic`
- **1-2 tickets** → use `--ticket` twice
- **Mixed tickets** (UI + backend) → epic mode handles both. Backend tickets get ACs-only specs.

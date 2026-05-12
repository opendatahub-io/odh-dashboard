# Large Tasks with Claude Code Goals

Guide for using the Claude Code `/goal` command to tackle complex, multi-step development tasks in the ODH Dashboard monorepo.

## Overview

Large tasks — refactors spanning many files, greenfield features with test suites, multi-package migrations — benefit from an autonomous agent approach where Claude repeatedly works, verifies progress, and self-corrects until done. The `/goal` command, built into Claude Code, implements this pattern natively.

The core idea: instead of manually prompting each step, you set a completion condition and Claude keeps working across turns until an independent evaluator confirms the condition is met. After each turn a small fast model checks whether the goal holds. If not, Claude starts another turn automatically with guidance on what still needs to happen.

## How It Works

1. You run `/goal <condition>` describing the desired end state.
2. Claude immediately starts working toward that condition — no separate prompt needed.
3. After each turn, a small fast model (Haiku by default) evaluates whether the condition is satisfied based on what Claude has surfaced in the conversation.
4. If the condition is **not** met, Claude starts another turn with the evaluator's reasoning as guidance.
5. If the condition **is** met, the goal clears automatically and Claude returns control to you.

A `◎ /goal active` indicator shows how long the goal has been running. You can check status at any time with `/goal` (no arguments).

## Compatibility

`/goal` is a built-in Claude Code feature available in:

- **Claude Code CLI** — terminal sessions
- **Claude Code Desktop** — Mac and Windows apps
- **Claude Code Web** — claude.ai/code
- **IDE Extensions** — VS Code and JetBrains

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- A working ODH Dashboard dev environment (see [Dev Setup](dev-setup.md))
- Workspace trust accepted (required for the hooks system that powers `/goal`)

## Usage

### Setting a goal

Run `/goal` followed by the condition you want satisfied:

```text
/goal all ESLint errors in packages/gen-ai are fixed and npm run lint passes clean
```

Setting a goal starts a turn immediately with the condition itself as the directive. You do not need to send a separate prompt. If a goal is already active, the new one replaces it.

### Checking status

Run `/goal` with no arguments to see:

- The active condition
- How long it has been running
- Number of turns evaluated
- Current token spend
- The evaluator's most recent reasoning

### Clearing a goal early

```text
/goal clear
```

Aliases: `stop`, `off`, `reset`, `none`, `cancel`. Running `/clear` to start a new conversation also removes any active goal.

### Resuming a session

A goal that was still active when a session ended is restored when you resume with `--resume` or `--continue`. The turn count, timer, and token baseline reset on resume. Already achieved or cleared goals are not restored.

### Non-interactive mode

`/goal` works in headless mode. Setting a goal with `-p` runs the loop to completion in a single invocation:

```bash
claude -p "/goal CHANGELOG.md has an entry for every PR merged this week"
```

Interrupt with Ctrl+C to stop before the condition is met.

## Writing Effective Conditions

The evaluator judges your condition against what Claude has surfaced in the conversation. It does not run commands or read files independently, so write the condition as something Claude's own output can demonstrate.

A condition that holds up across many turns usually has:

### One measurable end state

A test result, a build exit code, a file count, an empty queue.

```text
Good: npm test exits 0 for the auth module
Bad:  make the tests better
```

### A stated check

How Claude should prove it — an explicit command to run.

```text
Good: npm run type-check exits 0 and git status is clean
Bad:  everything compiles
```

### Constraints that matter

Anything that must not change on the way there.

```text
Good: no other test file outside packages/gen-ai is modified
Bad:  fix the tests (could touch unrelated files)
```

### Turn or time bounds

Include a turn or time clause to cap how long a goal runs:

```text
/goal all unit tests in packages/model-serving pass, or stop after 20 turns
```

The condition can be up to 4,000 characters.

## Examples for ODH Dashboard

### Fixing lint across a package

```text
/goal all ESLint errors in packages/gen-ai/frontend/src are resolved and npm run lint -- --filter=@odh-dashboard/gen-ai exits 0
```

### Implementing a feature with tests

```text
/goal the ConnectionTypeField component renders all field types (text, password, dropdown, file), validation errors display inline, unit tests cover happy path and error states, and npm run test passes with no failures
```

### Migrating Cypress tests

```text
/goal Robot Framework tests for model serving are migrated to Cypress following the patterns in .claude/rules/cypress-e2e.md, the new tests pass when run with npx cypress run, and no existing tests are broken
```

### Multi-file refactor

```text
/goal all model-serving API hooks use React Query instead of useFetchState, npm run type-check exits 0, and npm run test -- --filter=@odh-dashboard/model-serving passes
```

### Type-check cleanup

```text
/goal npm run type-check exits 0 with zero errors across all packages, or stop after 30 turns
```

## Combining with Auto Mode

[Auto mode](https://code.claude.com/docs/en/auto-mode-config) approves tool calls automatically within a single turn but does not start new turns. `/goal` adds a separate evaluator that checks your condition after every turn. The two are complementary:

- **Auto mode** removes per-tool permission prompts
- **`/goal`** removes per-turn prompts

Together they let Claude work through a large task fully autonomously.

## Comparison with Other Approaches

| Approach | Next turn starts when | Stops when |
|----------|----------------------|------------|
| `/goal` | The previous turn finishes | A model confirms the condition is met |
| `/loop` | A time interval elapses | You stop it, or Claude decides the work is done |
| Stop hook | The previous turn finishes | Your own script or prompt decides |

- **`/goal`** is a session-scoped shortcut: type a condition and it is active for the current session only.
- **Stop hook** lives in your settings file, applies to every session in its scope, and can run a script for deterministic checks.
- **`/loop`** re-runs on a time interval — better for polling or periodic checks than goal-directed work.

## When to Use `/goal`

**Good for:**

- Tasks with clear, verifiable success criteria (tests pass, lint clean, type-check succeeds)
- Multi-file refactors with repetitive patterns
- Test generation where Claude can run tests and fix failures iteratively
- Migrations following a known pattern (Robot to Cypress, PF5 to PF6, etc.)
- Working through a backlog of labeled issues until the queue is empty
- Implementing a design doc until all acceptance criteria hold

**Not good for:**

- Tasks requiring design decisions or UX judgment
- One-shot operations (single file edits, quick bug fixes)
- Tasks with unclear or subjective success criteria
- Production debugging requiring human analysis

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Goal never completes | Condition is too vague or unverifiable | Rewrite with a concrete command exit code |
| Goal completes too early | Condition does not capture all requirements | Add specific checks (e.g., "and no other files are modified") |
| Claude repeats the same mistake | Context growing stale over many turns | Add a turn limit ("or stop after N turns") and resume with a fresh goal |
| `/goal` command not available | Workspace trust not accepted or hooks disabled | Accept the trust dialog; check that `disableAllHooks` is not set |

## Further Reading

- [Claude Code `/goal` documentation](https://code.claude.com/docs/en/goal)
- [Auto mode configuration](https://code.claude.com/docs/en/auto-mode-config)
- [Scheduled tasks and `/loop`](https://code.claude.com/docs/en/scheduled-tasks)
- [Hooks guide](https://code.claude.com/docs/en/hooks-guide)
- [Dev Setup](dev-setup.md) — ODH Dashboard local environment
- [Best Practices](best-practices.md) — general coding practices

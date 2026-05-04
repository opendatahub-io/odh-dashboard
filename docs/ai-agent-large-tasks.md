# Large Tasks with AI Agents

Guide for using iterative AI agent loops to tackle complex, multi-step development tasks in the ODH Dashboard monorepo.

## Overview

Large tasks — refactors spanning many files, greenfield features with test suites, multi-package migrations — benefit from an iterative agent approach where the AI repeatedly works on a prompt, verifies progress, and self-corrects until done. The [Ralph Loop plugin](https://github.com/rsun19/ralph-loop) implements this pattern for Claude Code (Cursor's underlying agent engine).

The core idea: instead of a single-shot prompt, you run a loop that feeds the same task description back to the agent after each attempt. The agent sees its prior file changes and test output, enabling self-referential improvement across iterations.

## Compatibility

The Ralph Loop plugin works with:

- **Claude Code CLI** — the primary target; commands run directly in the terminal
- **Cursor IDE** — compatible with Cursor's Claude-based agents when the plugin is installed at the system level (global Claude Code configuration)

## Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) or Cursor IDE with agent mode
- Git (the plugin uses bash scripts)
- A working ODH Dashboard dev environment (see [Dev Setup](dev-setup.md))

## Installing the Ralph Loop Plugin

### Clone the plugin

```bash
git clone https://github.com/rsun19/ralph-loop.git ~/ralph-loop
```

### Load for a single session (quick start)

```bash
claude --plugin-dir ~/ralph-loop
```

Changes are picked up with `/reload-plugins` without restarting the session.

### Permanent install

Inside Claude Code:

1. Add the local marketplace:

```bash
/plugin marketplace add ~/ralph-loop
```

2. Run `/plugin` to open the plugin TUI
3. Navigate to **Marketplaces**
4. Select your local ralph-loop marketplace
5. Install the plugin
6. Run `/reload-plugins` to apply

> **Note:** Do not use `/plugin install ralph-loop` directly — that targets the official marketplace.

### Verify installation

Run `/help` in Claude Code. You should see `/ralph-loop:ralph-loop`, `/ralph-loop:cancel-ralph`, and `/ralph-loop:help` in the available commands.

## Usage

### Basic syntax

```bash
/ralph-loop:ralph-loop "<prompt>" [OPTIONS]
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--max-iterations <n>` | Stop after N iterations | unlimited |
| `--completion-promise <text>` | Phrase that signals completion | none |
| `--verify <command>` | Shell command to validate completion (exit non-zero = rejected) | none |

### Example: fixing lint across the monorepo

```bash
/ralph-loop:ralph-loop "Fix all ESLint errors in packages/gen-ai/frontend/src. Run npm run lint -- --filter=@odh-dashboard/gen-ai after each fix." --completion-promise "DONE" --verify "npm run lint -- --filter=@odh-dashboard/gen-ai" --max-iterations 15
```

### Example: implementing a feature with tests

```bash
/ralph-loop:ralph-loop "Implement the ConnectionTypeField component with full unit test coverage. Requirements:
- Component renders all field types (text, password, dropdown, file)
- Validation errors display inline
- Tests cover happy path and error states
- npm run test passes" --completion-promise "COMPLETE" --max-iterations 20
```

### Example: migrating Cypress tests

```bash
/ralph-loop:ralph-loop "Migrate the Robot Framework tests in packages/cypress/tests/e2e/modelServing/ to Cypress following the patterns in cypress-e2e.md. Each iteration: run the new tests, fix failures, repeat." --completion-promise "MIGRATION DONE" --verify "npx cypress run --spec 'packages/cypress/tests/e2e/modelServing/**'" --max-iterations 30
```

## How Verification Works

When `--completion-promise` is set, the plugin enforces these checks before accepting completion:

1. **Iteration 1 rejection** — promises on the first iteration are always rejected, forcing at least one verification cycle
2. **Checklist enforcement** — the agent must output a `RALPH VERIFICATION` checklist with `[PASS]`/`[FAIL]` per requirement; any `[FAIL]` triggers rejection
3. **`--verify` command (optional)** — the hook runs the command and rejects the promise if it exits non-zero

### Without `--verify` (checklist mode)

The agent self-reports a pass/fail checklist. Suitable for tasks where automated verification is impractical.

### With `--verify` (zero trust mode)

The hook independently runs your command. Use this for tasks with deterministic success criteria (tests pass, lint clean, build succeeds).

## Hybrid Mode: Context Resets + Iteration Limits

For very large tasks where the agent might "dig itself into a hole," hybrid mode spawns fresh sessions periodically while persisting work through files and git:

```bash
~/ralph-loop/scripts/hybrid-ralph.sh "Refactor all model-serving API hooks to use React Query" \
  --outer-max 8 \
  --inner-max 4 \
  --completion-promise "REFACTOR COMPLETE" \
  --verify "npm run type-check && npm run test -- --filter=@odh-dashboard/model-serving"
```

| Flag | Description | Default |
|------|-------------|---------|
| `--outer-max N` | Maximum context resets (fresh sessions) | 10 |
| `--inner-max N` | Maximum iterations per session | 5 |
| `--cool-down N` | Seconds between outer loops | 2 |

> **Warning:** Hybrid mode does not support subagents. Use the standard `/ralph-loop` command if your task benefits from agent delegation.

## Writing Effective Prompts

### Include clear completion criteria

```text
Bad:  "Make the tests better."
Good: "Add unit tests for useModelServingPlatform hook covering:
       - Returns KServe when only KServe is installed
       - Returns ModelMesh when only ModelMesh is installed
       - Returns undefined when neither is installed
       - npm run test passes with no failures"
```

### Reference project conventions

Point the agent at relevant rules and docs:

```text
"Follow the patterns in .claude/rules/unit-tests.md and .claude/rules/conventions.md.
 Use the mock patterns from frontend/src/__mocks__/."
```

### Use incremental goals for large tasks

```text
"Phase 1: Create the data types and API hook (with tests)
 Phase 2: Build the table component (with tests)
 Phase 3: Wire the page route and add navigation"
```

### Always set `--max-iterations`

This is your safety net against infinite loops on impossible or underspecified tasks.

## When to Use Ralph Loop

**Good for:**

- Tasks with clear, automatable success criteria (tests pass, lint clean, type-check succeeds)
- Multi-file refactors with repetitive patterns
- Test generation where the agent can run tests and fix failures iteratively
- Migrations following a known pattern (Robot → Cypress, PF5 → PF6, etc.)

**Not good for:**

- Tasks requiring design decisions or UX judgment
- One-shot operations (single file edits, quick bug fixes)
- Tasks with unclear or subjective success criteria
- Production debugging requiring human analysis

## Cancelling a Loop

```bash
/ralph-loop:cancel-ralph
```

This immediately stops the active loop without losing work already written to files.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Loop never terminates | Missing `--max-iterations` | Always set a max; start with 10–20 |
| Promise accepted too early | Weak verification | Add `--verify` with a concrete command |
| Agent repeats same mistake | Context pollution in long sessions | Switch to hybrid mode with shorter `--inner-max` |
| Hook script fails on macOS | Missing bash dependencies | Ensure Git is installed; verify `bash --version` >= 3.2 |

## Further Reading

- [Ralph Loop Plugin README](https://github.com/rsun19/ralph-loop)
- [Original Ralph technique](https://ghuntley.com/ralph/)
- [Dev Setup](dev-setup.md) — ODH Dashboard local environment
- [Best Practices](best-practices.md) — general coding practices

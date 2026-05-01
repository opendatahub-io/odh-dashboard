# Multi-Agent Workflows

Run multiple AI agent sessions in parallel to accelerate development across the ODH Dashboard monorepo. This guide covers the fundamentals — git worktree isolation, conflict avoidance, and best practices — then links to detailed sub-pages for [local](multi-agent-local.md) and [remote](multi-agent-remote.md) execution.

## When to Use Multi-Agent Sessions

Multi-agent workflows are most effective when tasks are independent and touch different areas of the codebase:

| Scenario | Example |
|----------|---------|
| Parallel feature work | Implement a new page in `packages/gen-ai/` while another agent refactors `packages/model-registry/` |
| Implementation + review | One agent implements a feature while another reviews a separate PR |
| Code + documentation | One agent writes code while another updates docs or creates Jira tickets |
| Cross-package tasks | Each agent owns a different package in the monorepo |

Avoid multi-agent sessions for tightly coupled changes to the same files — merge conflicts outweigh the speed gain.

## Git Worktree Fundamentals

Each agent session needs its own working directory to avoid file conflicts. Git worktrees provide lightweight, isolated checkouts that share the same `.git` history.

### Built-in Worktree Support

Claude Code creates and manages worktrees automatically:

```bash
# Start a session with an auto-created worktree
claude -w

# Start a named worktree session
claude -w -n "feature-gen-ai-tools"

# Start in read-only plan mode (no file modifications)
claude -w --permission-mode plan
```

Worktrees are created under `.claude/worktrees/<name>/` (gitignored). Each gets its own branch based on `upstream/main`.

### Manual Worktree Creation

For full control over branch names or base commits:

```bash
# Create a worktree with a specific branch name
git worktree add .claude/worktrees/my-feature -b my-feature-branch upstream/main

# Start a session in an existing worktree
cd .claude/worktrees/my-feature
claude

# List all active worktrees
git worktree list

# Remove a worktree after merging
git worktree remove .claude/worktrees/my-feature
```

### Naming Conventions

Use descriptive names that indicate the task scope:

| Pattern | Example |
|---------|---------|
| Jira ticket | `rhoaieng-12345` |
| Feature area | `gen-ai-mcp-tools` |
| Task type | `review-pr-7421` |
| Package scoped | `model-registry-refactor` |

## Built-in Multi-Agent Features

Claude Code provides two built-in mechanisms for multi-agent work in addition to manual worktree sessions.

### Agent Teams (Experimental)

Agent Teams coordinate multiple Claude Code sessions as a team — one lead and several teammates — with a shared task list and direct inter-agent messaging.

Enable with:

```bash
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude
```

| Concept | Description |
|---------|-------------|
| **Lead** | The session you interact with. Delegates work via a shared task list |
| **Teammates** | Autonomous sessions that pick up tasks, work in their own worktrees, and report back |
| **Task list** | Shared `TodoWrite`/`TodoRead` board visible to all agents |
| **Messaging** | Teammates communicate with the lead and each other via `SendMessage` |

Display modes:
- **In-process** — all teammates run in one terminal. Cycle with `Shift+Down`
- **Split-panes** — each teammate gets its own tmux or iTerm2 pane for parallel visibility

Guidelines:
- Start with 3-5 teammates. More teammates increase coordination overhead
- Assign 5-6 tasks per teammate for optimal throughput
- Use subagent definitions from `.claude/agents/` as teammate roles for specialization
- Add hooks (`TeammateIdle`, `TaskCreated`, `TaskCompleted`) for quality gates

### Subagents

Subagents delegate a focused task to a single child session that runs in its own context window and reports results back to the caller.

Define reusable subagent roles in `.claude/agents/<name>.md`:

```markdown
---
name: reviewer
description: Reviews code for style and correctness
tools:
  - Read
  - Bash(git diff:*)
model: sonnet
---

Review the provided code for correctness, style, and test coverage.
```

Invoke with the `Agent` tool or via `claude agents` CLI commands. Each subagent gets its own context window, tool allowlist, and optional `--worktree` isolation.

Use subagents for focused tasks where only the result matters (e.g., linting a file, researching an API). Use Agent Teams when multiple agents need to coordinate and communicate.

### Choosing a Multi-Agent Approach

| Approach | Best for | Coordination | Cost |
|----------|----------|--------------|------|
| **Agent Teams** | Large features requiring parallel work with coordination | Shared task list + messaging | Higher (multiple full sessions) |
| **Subagents** | Focused tasks where only the result matters | Caller manages delegation | Lower (scoped context windows) |
| **Manual worktrees** | Full control over session lifecycle and prompts | Developer manages via terminal panes | Variable |

## Shared Specs Directory

Use `.claude/local-specs/` in the main repo root to share planning documents across worktrees without committing them to the repository:

```bash
# From the main repo root, write a spec
cat > .claude/local-specs/feature-plan.md << 'EOF'
# Feature: MCP Server Configuration
## Goal
Add a configuration page for MCP servers in the gen-ai package.
## Key decisions
- Use PatternFly v6 table for the server list
- Store config in a ConfigMap per namespace
EOF
```

Worktrees at `.claude/worktrees/<name>/` have their own directory tree and do not automatically resolve `.claude/local-specs/` to the main repo root. To read shared specs from inside a worktree, use the repo root path:

```bash
# Find the main repo root from any worktree
REPO_ROOT=$(git rev-parse --show-toplevel)/..
# Read a shared spec
cat "$REPO_ROOT/.claude/local-specs/feature-plan.md"
```

This directory is gitignored. Use it for design specs, task breakdowns, and context that implementation sessions need to reference.

## Conflict Avoidance

### Partition Work by Area

Assign each agent session to a distinct area of the monorepo:

```text
Session 1 (implementation): packages/gen-ai/frontend/src/
Session 2 (implementation): packages/model-registry/frontend/src/
Session 3 (review):         read-only across the repo
Session 4 (ad-hoc):         docs/, .claude/rules/
```

### Rules

- **One branch per worktree** — never share a branch between sessions
- **Avoid shared config files** — changes to `package.json` (root), `tsconfig`, or `eslint-config` affect all packages; serialize these or assign to one session
- **Lockfile caution** — `npm install` in one worktree regenerates `package-lock.json`; run installs from the main repo, not from worktrees
- **Plan mode for read-only** — use `--permission-mode plan` for review or research sessions that should not modify files
- **Communicate via specs** — use `.claude/local-specs/` to pass context between sessions rather than relying on shared branches

### What to Serialize

Some operations must run in one session at a time:

- Root `package.json` or `package-lock.json` changes
- Shared infrastructure packages (`eslint-config`, `jest-config`, `tsconfig`)
- CI/CD configuration (`.github/`, `.tekton/`)
- `CLAUDE.md`, `BOOKMARKS.md`, or `.claude/rules/` modifications

## Best Practices

### Session Limits

Run 3–4 concurrent sessions maximum. Each session consumes memory and CPU for file watching, TypeScript compilation, and webpack builds. Monitor system resources and reduce sessions if the machine slows down.

### Context Management

- Use `/compact` regularly to compress conversation history and stay within context limits
- Start sessions with a clear, specific prompt describing the task scope
- Reference spec files from `.claude/local-specs/` for complex tasks

### Notifications

Configure terminal notifications to alert when a session completes or requires input:

```bash
# macOS — notify when a long-running session finishes
claude -w -n "gen-ai-feature" && terminal-notifier -message "gen-ai session done" -title "Claude Code"
```

### Cleanup

Remove worktrees promptly after merging to avoid stale checkouts:

```bash
# List worktrees
git worktree list

# Remove completed worktrees
git worktree remove .claude/worktrees/rhoaieng-12345

# Prune worktrees whose directories were deleted
git worktree prune
```

## Next Steps

- **[Local Multi-Agent Workflows](multi-agent-local.md)** — terminal layout, session startup, workflow patterns, MCP integrations
- **[Remote Multi-Agent Workflows](multi-agent-remote.md)** — Ambient platform, built-in workflows, integrations, AgentReady assessment

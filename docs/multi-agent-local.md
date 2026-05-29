# Local Multi-Agent Workflows

Run multiple Claude Code sessions in parallel on your local machine using git worktrees for isolation. This guide covers terminal layout, session startup, workflow patterns, and session management.

For foundational concepts (worktrees, conflict avoidance, best practices), see [Multi-Agent Workflows](multi-agent-workflows.md).

## Prerequisites

- Claude Code CLI installed and authenticated
- Node.js >= 22.0.0, npm >= 10.0.0
- Git configured with remote access to the repository
- Terminal emulator supporting split panes (built-in in most modern terminals)

## Terminal Layout

Use a four-pane terminal layout to manage parallel sessions:

```text
┌─────────────────────┬─────────────────────┐
│                     │                     │
│   Session 1         │   Session 2         │
│   (implementation)  │   (implementation)  │
│                     │                     │
├─────────────────────┼─────────────────────┤
│                     │                     │
│   Session 3         │   Session 4         │
│   (review)          │   (ad-hoc)          │
│                     │                     │
└─────────────────────┴─────────────────────┘
```

| Pane | Role | Permission Mode | Purpose |
|------|------|----------------|---------|
| 1 | Implementation | Default | Primary feature work — creates and modifies files |
| 2 | Implementation | Default | Secondary feature work in a different package |
| 3 | Review | `plan` | PR reviews, code analysis — read-only, no file changes |
| 4 | Ad-hoc | Default or `plan` | Docs, Jira triage, research, quick fixes |

Adjust the number of panes based on the workload. Two panes suffice for most tasks.

## Session Startup

For an alternative to manually managing terminal panes, consider [Agent Teams](multi-agent-workflows.md#built-in-multi-agent-features) — Claude Code's built-in experimental feature that coordinates multiple sessions with a shared task list and inter-agent messaging.

### Quick Start (Automatic Worktrees)

```bash
# Pane 1 — implementation session with auto-worktree
claude -w -n "gen-ai-mcp-tools"

# Pane 2 — second implementation session
claude -w -n "model-registry-refactor"

# Pane 3 — read-only review session
claude -w -n "review-pr-7421" --permission-mode plan

# Pane 4 — ad-hoc session (docs, triage)
claude -w -n "docs-update"
```

### Manual Setup (Full Control)

```bash
# Step 1: Create worktrees from repo root
git worktree add .claude/worktrees/gen-ai-feature -b gen-ai-feature upstream/main
git worktree add .claude/worktrees/mr-refactor -b mr-refactor upstream/main

# Step 2: Install dependencies (from the main repo root, not from worktrees)
npm install

# Step 3: Start sessions
# Pane 1:
cd .claude/worktrees/gen-ai-feature && claude
# Pane 2:
cd .claude/worktrees/mr-refactor && claude
```

### Resuming Sessions

```bash
# List active sessions
claude sessions list

# Resume a named session
claude sessions resume "gen-ai-mcp-tools"
```

## Workflow Patterns

### Task Implementation

Assign one Jira ticket per session, scoped to a single package or feature area.

```bash
# Start a session with context
claude -w -n "rhoaieng-12345"
# Then in the session:
# "Implement RHOAIENG-12345 — add MCP server configuration page to the gen-ai package.
#  Read .claude/local-specs/mcp-config-spec.md for the design spec."
```

Best practices:
- Provide the Jira ticket key in the initial prompt so the agent can fetch context via MCP
- Reference spec files from `.claude/local-specs/` for complex tasks
- Keep the session focused on a single package to avoid cross-package conflicts

### PR Review

Use plan mode to review pull requests without modifying files.

```bash
claude -w -n "review-pr-7421" --permission-mode plan
# Then in the session:
# "Review PR #7421. Check for PatternFly v6 compliance, proper test coverage,
#  and adherence to the conventions in .claude/rules/."
```

### PR Refinement

After receiving review feedback, start a session to address comments.

```bash
claude -w -n "refine-pr-7421"
# Then in the session:
# "Address review comments on PR #7421. The reviewer requested:
#  1. Add unit tests for the useServerConfig hook
#  2. Replace inline styles with PF utility classes
#  3. Add aria-labels to icon buttons"
```

### RFE Planning

Use a plan-mode session to draft specs and design documents.

```bash
claude -w -n "rfe-mcp-config" --permission-mode plan
# Then in the session:
# "Draft a design spec for MCP server configuration in gen-ai.
#  Save the spec to .claude/local-specs/mcp-config-spec.md."
```

## MCP Integrations

MCP (Model Context Protocol) servers provide external context to agent sessions. Configure them in `.claude/settings.local.json` (gitignored) or project-level `.claude/settings.json`.

### Available Integrations

| MCP Server | Purpose | Example Use |
|------------|---------|-------------|
| Jira (mcp-atlassian) | Fetch ticket details, create issues, add comments | `"Implement RHOAIENG-12345"` — agent reads acceptance criteria from Jira |
| Confluence (mcp-atlassian) | Read design docs, architecture pages | `"Check the model serving architecture page for context"` |
| GitHub (mcp) | Read PRs, issues, review comments | `"Review the feedback on PR #7421"` |

### Cross-Worktree Handoff

Pass context between sessions using shared specs:

```bash
# Session 1 (planning): writes a spec
# "Save the design decisions to .claude/local-specs/mcp-config-decisions.md"

# Session 2 (implementation): reads the spec
# "Read .claude/local-specs/mcp-config-decisions.md and implement the MCP config page"
```

For Jira-based handoff, one session can create sub-tasks that another session picks up:

```bash
# Session 1: "Create Jira sub-tasks under RHOAIENG-12345 for each component"
# Session 2: "Implement RHOAIENG-12346 (the MCP config table component)"
```

## Session Management

### Monitoring

Check on running sessions from any terminal:

```bash
# List all active Claude Code sessions
claude sessions list

# Check system resource usage
top -l 1 | head -20
```

### Context Compression

Long-running sessions accumulate context. Use `/compact` to compress conversation history:

```text
/compact
```

Run `/compact` after completing a major subtask or when the session warns about context limits.

### Notifications

Set up notifications for session completion:

```bash
# Notify on completion (macOS)
claude -w -n "gen-ai-feature" && terminal-notifier \
  -message "gen-ai session complete" \
  -title "Claude Code" \
  -sender com.microsoft.VSCode

# Notify on completion (Linux)
claude -w -n "gen-ai-feature" && notify-send "Claude Code" "gen-ai session complete"
```

### Cleanup

After merging PRs, remove worktrees to free disk space:

```bash
# Remove specific worktrees
git worktree remove .claude/worktrees/gen-ai-feature
git worktree remove .claude/worktrees/mr-refactor

# Prune stale worktree references
git worktree prune

# Verify cleanup
git worktree list
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm install` fails in worktree | Run `npm install` from the main repo root, not the worktree |
| Worktree branch conflicts | Each worktree must use a unique branch — check with `git worktree list` |
| Session runs out of context | Use `/compact` to compress history, or start a new session with a focused prompt |
| Port conflicts between dev servers | Each package uses a unique port (9100+) — check `package.json` `module-federation.local.port` |
| Stale worktree after branch deletion | Run `git worktree prune` to clean up references |

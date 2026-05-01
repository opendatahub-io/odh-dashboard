# Remote Multi-Agent Workflows

Run AI agent sessions on remote infrastructure using platforms like [Ambient](https://github.com/ambient-code/platform). Remote execution offloads compute, enables persistent long-running sessions, and scales beyond local machine limits.

For foundational concepts (worktrees, conflict avoidance, best practices), see [Multi-Agent Workflows](multi-agent-workflows.md). For local parallel sessions, see [Local Multi-Agent Workflows](multi-agent-local.md).

## When to Use Remote Execution

| Scenario | Local | Remote |
|----------|-------|--------|
| Quick fixes and small tasks | Preferred | Overkill |
| Long-running feature implementation | Limited by machine resources | Preferred — persistent sessions |
| Parallel execution at scale (5+ agents) | Machine slows down | Preferred — elastic compute |
| CI/CD-triggered automation | Not applicable | Preferred — event-driven workflows |
| Team-shared agent infrastructure | Not possible | Preferred — shared workspace |

## Platform Concepts

Ambient organizes work into a hierarchy of abstractions:

| Concept | Description | Local Equivalent |
|---------|-------------|------------------|
| **Session** | A single agent execution environment with its own workspace | One terminal pane running `claude` |
| **Workspace** | Isolated file system and git state for a session | A git worktree |
| **Job** | A task submitted to a session with a specific prompt | A prompt sent to a Claude Code session |
| **Workflow** | A predefined template combining prompts, tools, and configuration | A `.claude/local-specs/` spec + manual session startup |

### Sessions

A session is a long-lived agent environment. Create sessions via the Ambient CLI or API:

```bash
# Create a session targeting this repository
ambient session create \
  --repo opendatahub-io/odh-dashboard \
  --branch main \
  --name "gen-ai-feature"

# List active sessions
ambient session list

# Connect to a session for interactive use
ambient session connect "gen-ai-feature"

# Stop a session
ambient session stop "gen-ai-feature"
```

Sessions persist across disconnections — reconnect to pick up where the agent left off.

### Jobs

Submit specific tasks to a running session:

```bash
# Submit a job with a prompt
ambient job create \
  --session "gen-ai-feature" \
  --prompt "Implement the MCP server configuration table in packages/gen-ai/"

# Check job status
ambient job status <job-id>

# View job output
ambient job logs <job-id>
```

## Built-in Workflows

Ambient provides predefined workflows for common development tasks:

| Workflow | Purpose | Use Case |
|----------|---------|----------|
| **Bugfix** | Diagnose and fix a reported bug | `ambient workflow run bugfix --issue RHOAIENG-12345` |
| **Triage** | Analyze issues and recommend priority/severity | `ambient workflow run triage --issue RHOAIENG-12345` |
| **Spec-Kit** | Generate implementation specs from requirements | `ambient workflow run spec-kit --requirements "Add MCP config page"` |
| **PRD/RFE** | Draft product requirements or feature requests | `ambient workflow run prd --feature "MCP server management"` |

### Running a Built-in Workflow

```bash
# Run the bugfix workflow against a Jira ticket
ambient workflow run bugfix \
  --repo opendatahub-io/odh-dashboard \
  --issue RHOAIENG-12345

# Run the triage workflow
ambient workflow run triage \
  --repo opendatahub-io/odh-dashboard \
  --issue RHOAIENG-12345

# Generate an implementation spec
ambient workflow run spec-kit \
  --repo opendatahub-io/odh-dashboard \
  --requirements "Add a configuration page for MCP servers in the gen-ai package"
```

## Custom Workflows

Define project-specific workflows in `.ambient/ambient.json` at the repository root:

```json
{
  "workflows": [
    {
      "name": "dashboard-feature",
      "description": "Implement a Dashboard feature with tests",
      "steps": [
        {
          "prompt": "Read CLAUDE.md and the relevant .claude/rules/ files for the area you are working in.",
          "tools": ["read", "search"]
        },
        {
          "prompt": "Implement the feature described in the job prompt. Follow PatternFly v6 conventions and add data-testid attributes.",
          "tools": ["read", "write", "bash"]
        },
        {
          "prompt": "Run npm run lint:fix && npm run type-check. Fix any errors.",
          "tools": ["bash", "write"]
        },
        {
          "prompt": "Add unit tests following .claude/rules/unit-tests.md patterns.",
          "tools": ["read", "write", "bash"]
        }
      ]
    }
  ]
}
```

### Security Considerations

Workflows with `bash` and `write` tools can execute arbitrary commands on the agent's workspace. Before running a workflow:

- Review workflow definitions before execution, especially those loaded from external Git URLs
- Limit `bash` and `write` tools to steps that genuinely require them
- Use `read` and `search` tools for steps that only need to inspect the codebase
- Pin external workflow templates to a specific commit hash rather than a branch

### Loading Workflows

Workflows can be loaded from the repository or from a remote Git URL:

```bash
# Run a workflow defined in .ambient/ambient.json
ambient workflow run dashboard-feature \
  --repo opendatahub-io/odh-dashboard \
  --prompt "Add MCP server configuration to gen-ai package"

# Run a workflow from a remote template repository
ambient workflow run \
  --from git@github.com:team/workflow-templates.git#feature-template \
  --repo opendatahub-io/odh-dashboard
```

## Integrations

Ambient connects to external services for context and automation:

| Integration | Purpose | Configuration |
|-------------|---------|---------------|
| **GitHub / GitLab** | Repository access, PR creation, issue tracking | Configured via Ambient platform settings |
| **Jira** | Read tickets, create issues, update status | MCP server or Ambient-native integration |
| **Confluence** | Read design docs, architecture pages | MCP server integration |
| **Google Workspace** | Access shared docs, sheets for requirements | Ambient-native integration |
| **MCP Servers** | Extend agent capabilities with custom tools | Defined in session or workflow configuration |

### MCP Server Configuration in Ambient

Ambient sessions can use MCP servers for external tool access:

```bash
# Create a session with MCP servers enabled
ambient session create \
  --repo opendatahub-io/odh-dashboard \
  --mcp-server jira \
  --mcp-server github \
  --name "feature-with-context"
```

The agent can then query Jira for ticket details, read PR comments from GitHub, and access Confluence documentation — the same MCP servers available locally.

## AgentReady Assessment

[AgentReady](https://github.com/ambient-code/agentready) evaluates a repository's readiness for AI agent workflows across 13 dimensions:

| Dimension | What It Checks |
|-----------|---------------|
| Documentation | README quality, contributing guides, architecture docs |
| Code structure | Consistent patterns, clear module boundaries |
| Test coverage | Test presence, framework configuration, CI integration |
| CI/CD | Pipeline configuration, automated checks |
| Dependency management | Lock files, version pinning, update automation |
| Security | Secret handling, vulnerability scanning |
| Code quality | Linting, formatting, static analysis |
| Build system | Build scripts, reproducibility |
| Issue tracking | Template usage, labeling, triage process |
| Agent instructions | CLAUDE.md, rules files, skill definitions |
| Extension points | Plugin system, modular architecture |
| Dev environment | Setup docs, containerization, dev scripts |
| Observability | Logging, monitoring, debugging tools |

### Running AgentReady

```bash
# Install AgentReady
npm install -g @ambient-code/agentready

# Run assessment on the current repository
agentready assess

# Run with detailed output
agentready assess --verbose

# Run specific dimensions only
agentready assess --dimensions documentation,agent-instructions,test-coverage
```

### Interpreting Results

AgentReady produces a score (0–100) per dimension and an overall readiness score. Use the results to identify gaps:

- **80+**: Ready for autonomous agent workflows
- **60–79**: Functional but agents may need extra guidance
- **Below 60**: Improve documentation, tests, or structure before relying on agents

ODH Dashboard scores high on agent instructions (CLAUDE.md, rules, skills) and code structure (monorepo conventions, TypeScript strict mode) due to its existing `.claude/` configuration.

## Monitoring and Management

### Job Tracking

```bash
# List all jobs for a session
ambient job list --session "gen-ai-feature"

# Stream job logs in real time
ambient job logs --follow <job-id>

# Cancel a running job
ambient job cancel <job-id>
```

### Session Management

```bash
# List all sessions with status
ambient session list --status running

# Pause a session (preserves state)
ambient session pause "gen-ai-feature"

# Resume a paused session
ambient session resume "gen-ai-feature"

# Delete a session and its workspace
ambient session delete "gen-ai-feature"
```

### Failure Handling

- **Job failures**: Check logs with `ambient job logs <job-id>`, then resubmit with a refined prompt
- **Session crashes**: Sessions auto-restart by default; check `ambient session events` for crash details
- **Resource limits**: Monitor with `ambient session resources`; scale up via platform settings if needed

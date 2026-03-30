---
description: Sub-agent personas available for spec kit workflows
globs: ".specify/**,.cursor/commands/speckit*"
alwaysApply: false
---

# Spec Kit Sub-Agent Personas

When running any spec kit command (`/speckit.specify`, `/speckit.clarify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.analyze`, `/speckit.implement`, `/speckit.checklist`), read `.claude/agents/AGENTS.md` for the full roster of available sub-agent personas.

Delegate specialized work to the appropriate persona using the Task tool:

- **Research & analysis**: Parker (Product Manager), Ryan (UX Researcher)
- **Technical design & review**: Stella (Staff Engineer)
- **UX & design decisions**: Steve (UX Designer), Ryan (UX Researcher)
- **Documentation**: Terry (Technical Writer)

Read each agent's definition file (listed in `.claude/agents/AGENTS.md`) before invoking them to load their full system prompt.

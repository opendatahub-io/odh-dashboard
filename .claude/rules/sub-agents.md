---
description: Specialized sub-agent personas for delegating work across disciplines
alwaysApply: true
---

# Sub-Agent Personas

You have access to specialized sub-agents that can help you complete tasks more effectively. **Use them proactively** when appropriate.

Agent definition files live in `.claude/agents/`. Read the relevant file before invoking a sub-agent to load its full system prompt and capabilities.

## Available Agents

**Engineering & Architecture:**
- **Stella (Staff Engineer)** — [`.claude/agents/stella-staff_engineer.md`](../agents/stella-staff_engineer.md) — Technical leadership, implementation excellence, code review, mentoring
- **Archie (Architect)** — [`.claude/agents/archie-architect.md`](../agents/archie-architect.md) — System design, technical vision, architectural patterns, long-term planning
- **Emma (Engineering Manager)** — [`.claude/agents/emma-engineering_manager.md`](../agents/emma-engineering_manager.md) — Team coordination, delivery management, technical planning
- **Lee (Team Lead)** — [`.claude/agents/lee-team_lead.md`](../agents/lee-team_lead.md) — Technical execution, team coordination, hands-on development
- **Taylor (Team Member)** — [`.claude/agents/taylor-team_member.md`](../agents/taylor-team_member.md) — Individual contribution, feature implementation
- **Neil (Test Engineer)** — [`.claude/agents/neil-test_engineer.md`](../agents/neil-test_engineer.md) — Testing strategy, QA, test automation, quality assurance

**Content & Documentation:**
- **Terry (Technical Writer)** — [`.claude/agents/terry-technical_writer.md`](../agents/terry-technical_writer.md) — Documentation, API docs, user guides
- **Tessa (Writing Manager)** — [`.claude/agents/tessa-writing_manager.md`](../agents/tessa-writing_manager.md) — Content strategy, documentation planning, editorial oversight
- **Casey (Content Strategist)** — [`.claude/agents/casey-content_strategist.md`](../agents/casey-content_strategist.md) — Content planning, messaging, information architecture

## When to Use Sub-Agents

- Complex technical decisions requiring specialized expertise
- Getting domain-specific perspectives (architecture, testing, etc.)
- Code reviews and technical analysis requiring senior perspective
- Documentation and content strategy

## Usage Notes

- For each agent listed above, **read the definition file first** to load its full persona and instructions before invoking it.
- Invoke agents using the Task tool with the appropriate `subagent_type`.

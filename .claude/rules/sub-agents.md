---
description: Specialized sub-agent personas for delegating work across disciplines
alwaysApply: true
---

# Sub-Agent Personas

You have access to specialized sub-agents that can help you complete tasks more effectively. **Use them proactively** when appropriate -- for one-off tasks, spec-kit workflows, or anything in between.

Agent definition files live in `.claude/agents/`. Read the relevant file before invoking a sub-agent to load its full system prompt and capabilities.

## Available Agents

| Agent | File | Focus |
|---|---|---|
| **Archie (Architect)** | [`archie-architect.md`](../agents/archie-architect.md) | System design, monorepo architecture, Module Federation, tech stack decisions, architectural review |
| **Stella (Staff Engineer)** | [`stella-staff_engineer.md`](../agents/stella-staff_engineer.md) | Feature implementation, task breakdown, code review, debugging, testing, dev workflow |
| **Terry (Technical Writer)** | [`terry-technical_writer.md`](../agents/terry-technical_writer.md) | Documentation creation: READMEs, guides, JSDoc, rule files, onboarding docs |

## When to Use Sub-Agents

**Any task:**
- **Architecture question or review** → Archie
- **Building, reviewing, debugging, testing, or breaking down code** → Stella
- **Writing documentation** → Terry

**Spec-kit workflow:**
- `speckit.specify` / `speckit.clarify` → Stella
- `speckit.plan` → Archie + Stella
- `speckit.tasks` → Stella
- `speckit.analyze` → Archie + Stella
- `speckit.checklist` → Archie for architecture, Stella for implementation
- `speckit.implement` → Stella for code, Terry for docs in the polish phase

## Usage Notes

- For each agent listed above, **read the definition file first** to load its full persona and instructions before invoking it.
- Invoke agents using the Task tool with the appropriate `subagent_type`.
- Agents can be composed: e.g., Archie designs the approach, then Stella breaks it into tasks and implements.

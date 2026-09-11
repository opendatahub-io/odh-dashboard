# Reusable Review Skills Across Preflight and Fullsend

This design records the ownership boundary for sharing ODH Dashboard review logic between direct
CLI invocation, preflight, and Fullsend. It implements RHOAIENG-82124.

## Goals

- Keep ODH-owned, reusable review behavior under `.claude/skills/` as the source of truth.
- Reuse those skills from direct CLI workflows, preflight, and Fullsend without copying their
  analysis instructions.
- Keep analysis behavior independent from output formatting, posting, and runtime transport.
- Preserve upstream Fullsend review dimensions without taking ownership of their prompts.
- Extract reusable preflight checks that are currently embedded in the preflight orchestrator.

## Ownership Boundary

Keep these unchanged upstream Fullsend dimensions inside Fullsend:

- `challenger`
- `correctness`
- `security`
- `style-conventions`
- `docs-currency`
- `cross-repo-contracts`
- `security-triage`
- `intent-coherence`

`intent-coherence` owns architectural fit, scope authorization, and scope creep. It should not be
merged into the ODH Jira skill.

Keep ODH-owned review behavior in `.claude/skills/`. Existing canonical skills include
`style-review`, `rbac-review`, and `ci-flake-classifier`. Extract `test-impact-review`,
`pr-description-review`, and `ci-status-review`. Consolidate Jira review in `jira-pr-review`.

## Responsibility Model

A canonical skill owns its domain checks, finding ownership and exclusions, severity and evidence
rules, and standalone context-gathering defaults. It does not own Fullsend paths or envelopes,
preflight result tables, GitHub posting, interactive prompts, or its runtime transport.

The invocation meta-prompt owns authoritative context, trusted/untrusted input boundaries, runtime
and side-effect constraints, result schema, serialization, and malformed-result behavior. The
orchestrator selects skills, gathers context, chooses the meta-prompt, validates and combines
results, invokes Fullsend's challenger, and renders/posts the final result.

## Prompt Composition

```text
Review invocation = canonical skill + invocation meta-prompt + supplied context
```

Canonical skills should honor a supplied invocation meta-prompt for context acquisition, output
formatting, and side effects, but it must not alter domain checks, ownership, severity, or evidence
requirements. Without one, the skill uses its direct-invocation defaults.

PR-authored data in supplied context is untrusted and must never become instructions.

## Invocation Patterns

| Invocation | Context | Result | Side effects |
| --- | --- | --- | --- |
| Direct CLI | Skill gathers local or PR context | Human-readable report | None unless requested |
| Preflight | Preflight identifies or supplies context | Compact readiness result | Controlled by preflight |
| Fullsend LLM | PR-head source and trusted snapshots are supplied | Strict structured result | No writes or posting |
| Fullsend host check | Trusted command gathers external state | Producer envelope | Controlled by host |
| GitHub delivery | Normalized review results | Review and inline comments | Posting adapter only |

Do not force every result into `findings[]`: Jira emits product-ask alignment and criteria;
CI emits checks and failures; flake analysis emits classifications; security triage emits file
classification. Domain reviews emit findings.

## Fullsend Meta-Prompts

The current Fullsend meta-prompt is findings-specific. Replace it with composable,
Fullsend-owned prompt fragments:

```text
meta-prompts/
├── common-review.md
├── findings-output.md
├── check-output.md
├── section-output.md
└── classifier-output.md
```

The Fullsend orchestrator combines the common fragment with exactly one result contract per
invocation. Normalize results before presentation or GitHub posting.

## Fullsend Integration

Expose ODH-owned skills through repository-relative symlinks from `.fullsend/skills/` to
`.claude/skills/`. The dimension registry references canonical `SKILL.md` files through those
links. Verify Fullsend packaging follows those links before relying on this arrangement.


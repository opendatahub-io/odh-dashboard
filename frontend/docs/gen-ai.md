[Guidelines]: ../../docs/guidelines.md
[BOOKMARKS]: ../../BOOKMARKS.md
[Backend Overview]: ../../backend/docs/overview.md
[Architecture]: ../../docs/architecture.md
[Gen AI Package]: ../../packages/gen-ai/docs/overview.md
[Eval Hub Package]: ../../packages/eval-hub/docs/overview.md

# Gen AI

**Last Updated**: 2026-04-03 | **Template**: frontend-template v1

## Overview

The Gen AI frontend area covers LLM-related feature flags and type definitions in the main
dashboard codebase. The actual chatbot UI, LLM evaluation, and inference management features
live in federated packages (`packages/gen-ai` for the chatbot, `packages/eval-hub` for
evaluation workflows). This doc covers only the remnant host-side definitions.

## UI Entry Points

No pages or routes are registered in the main frontend for this area. All Gen AI UI is served
by the `packages/gen-ai` and `packages/eval-hub` federated packages, which register their own
routes and navigation items via the extension system.

## Architecture

The main frontend contains only feature-flag definitions and TypeScript types related to Gen AI:

```text
frontend/src/concepts/areas/
├── const.ts        # SupportedArea.LM_EVAL definition with featureFlags and reliantAreas
└── types.ts        # SupportedArea.LM_EVAL enum value ('lm-eval')

frontend/src/k8sTypes.ts
└── LMEvalKind      # TypeScript type mirroring the LMEvalJob CRD schema
```

`SupportedArea.LM_EVAL` is defined with `featureFlags: ['disableLMEval']` and
`reliantAreas: [SupportedArea.MODEL_REGISTRY, SupportedArea.MODEL_SERVING]`. The
`disableLMEval` flag in `OdhDashboardConfig` controls whether evaluation features are
available. `LMEvalKind` in `k8sTypes.ts` provides the TypeScript type for `LMEvalJob` CRs.

## State Management

No contexts or hooks exist in the main frontend for this area. All state management lives in
the federated packages.

## PatternFly Component Usage

Not applicable — no UI components exist in the main frontend for this area.

## Key Concepts

| Term | Definition |
|------|-----------|
| **SupportedArea.LM_EVAL** | Feature-area token in `frontend/src/concepts/areas/types.ts`. Controlled by the `disableLMEval` flag in `OdhDashboardConfig`. Both `MODEL_REGISTRY` and `MODEL_SERVING` must also be enabled. |
| **LMEvalKind** | TypeScript type in `frontend/src/k8sTypes.ts` mirroring the `LMEvalJob` CRD schema; carries `spec.modelArgs`, `spec.taskList`, `status.state`, and `status.results`. |

## Quick Start

Gen AI functionality requires the federated packages. See the [Gen AI Package] doc for chatbot
setup and the [Eval Hub Package] doc for evaluation workflow setup.

## Testing

No tests exist in the main frontend for this area. All test coverage lives in the respective
federated packages.

## Cypress Test Coverage

Not applicable — no Cypress tests target this area in the main frontend.

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| `packages/gen-ai` | Package (federated) | Full chatbot and LLM inference UI; loaded by Module Federation |
| `packages/eval-hub` | Package (federated) | Model evaluation workflows; loaded by Module Federation |
| `OdhDashboardConfig` (k8s CR) | Backend / Config | The `disableLMEval` flag enables or disables evaluation features via `SupportedArea.LM_EVAL` |

## Known Issues / Gotchas

- `SupportedArea.LM_EVAL` declares `reliantAreas: [MODEL_REGISTRY, MODEL_SERVING]`. If either
  of those areas is disabled, evaluation features are also disabled even if `disableLMEval` is
  `false`.
- The `LMEvalKind` type in `k8sTypes.ts` is used by federated packages; changes to this type
  require coordinated updates in `packages/eval-hub`.

## Related Docs

- [Gen AI Package] — full chatbot package with Go BFF
- [Eval Hub Package] — model evaluation hub package
- [Guidelines] — documentation style guide for this repo
- [BOOKMARKS] — full doc index
- [Backend Overview] — backend architecture and k8s proxy patterns
- [Architecture] — overall ODH Dashboard architecture

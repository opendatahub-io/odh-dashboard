# Gen AI

## Overview

- In the **main** `frontend/` app, Gen AI is only feature-area wiring and types: `SupportedArea.LM_EVAL` and `LMEvalKind`.
- Chatbot UI, eval workflows, and inference UX live in federated packages (`packages/gen-ai`, `packages/eval-hub`) via Module Federation—not in this tree.

## Key Concepts

| Term | Definition |
|------|-----------|
| **SupportedArea.LM_EVAL** | Area token in `frontend/src/concepts/areas/types.ts`. `featureFlags: ['disableLMEval']`; `reliantAreas: [MODEL_REGISTRY, MODEL_SERVING]`. |
| **LMEvalKind** | Type in `frontend/src/k8sTypes.ts` mirroring the `LMEvalJob` CRD (`spec.modelArgs`, `spec.taskList`, `status.state`, `status.results`). |

Host-side code locations: `concepts/areas/const.ts` and `types.ts` for the area definition;
`k8sTypes.ts` for `LMEvalKind`.

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| `packages/gen-ai` | Federated package | Chatbot and LLM inference UI. |
| `packages/eval-hub` | Federated package | Evaluation workflows; consumes shared types. |
| `OdhDashboardConfig` | Backend / Config | `disableLMEval` gates `SupportedArea.LM_EVAL`. |

## Known Issues / Gotchas

- **Reliant areas**: If `MODEL_REGISTRY` or `MODEL_SERVING` is off, LM eval is off even when
  `disableLMEval` is false.
- **Shared type**: Changes to `LMEvalKind` require coordinated updates in `packages/eval-hub`.

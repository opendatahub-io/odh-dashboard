# Segment Tracking — Limited Support Resources (RHOAIENG-73369)

Tracking checklist for [RHOAIENG-73369](https://redhat.atlassian.net/browse/RHOAIENG-73369), child of epic [RHOAIENG-69725](https://redhat.atlassian.net/browse/RHOAIENG-69725).

Event spec: [Google Doc](https://docs.google.com/document/d/1IaBRrVJfErziOK3g-maZ4Slr6qJqJhJpD4jgze6ke-0/edit?tab=t.0)

---

## PR 1: `Model Serving Unsupported Runtime Risk Dismissed`

New event fired when an admin closes the unsupported-resource acceptance modal without accepting.

### Properties

| Property | Values | Description |
|----------|--------|-------------|
| `runtimeResourceType` | `'serving-runtime-template'` \| `'llm-accelerator-config'` | Which admin surface |
| `resourceId` | string | Template or accelerator config identifier |
| `resourceName` | string | Display name shown in admin table |
| `version` | string | Runtime version from `opendatahub.io/runtime-version` annotation |
| `fastVersion` | string | Fast build version from `opendatahub.io/fast-version` annotation |
| `dismissAction` | `'cancel'` \| `'close'` | How the modal was dismissed |
| `outcome` | `'cancel'` | Standard tracking outcome |

### Implementation tasks

- [x] Create tracking constants file (`packages/model-serving/src/tracking/limitedSupportTracking.ts`) with event name, property types, and wrapper function
- [x] Extend `UnsupportedStatusAcceptanceModal` `onClose` to accept a `dismissAction` argument (`'cancel'` | `'close'`)
- [x] Add tracking to **serving runtime templates** toggle (`frontend/src/pages/modelServing/customServingRuntimes/CustomServingRuntimeEnabledToggle.tsx`) — fire event in `onClose` handler with `runtimeResourceType: 'serving-runtime-template'`
- [x] Add tracking to **LLM accelerator configs** toggle (`packages/llmd-serving/src/settings/llmAcceleratorConfigs/LlmAcceleratorConfigEnabledToggle.tsx`) — fire event in `onClose` handler with `runtimeResourceType: 'llm-accelerator-config'`
- [x] Unit test: serving runtime toggle fires dismissed event with correct properties on cancel
- [x] Unit test: serving runtime toggle fires dismissed event with correct properties on close
- [x] Unit test: accelerator config toggle fires dismissed event with correct properties on cancel
- [x] Unit test: accelerator config toggle fires dismissed event with correct properties on close
- [x] Update `UnsupportedStatusAcceptanceModal` existing tests to verify `dismissAction` argument

### Key files

| File | Role |
|------|------|
| `packages/model-serving/src/tracking/limitedSupportTracking.ts` | Tracking constants, types, `fireRiskDismissed` wrapper, `getResourceVersions` helper |
| `packages/model-serving/src/components/UnsupportedStatusAcceptanceModal.tsx` | Modal component — `onClose` now accepts `dismissAction` |
| `packages/model-serving/src/concepts/versions.ts` | Annotation constants and utils (`isUnsupportedResource`, `getFastVersion`) |
| `frontend/src/pages/modelServing/customServingRuntimes/CustomServingRuntimeEnabledToggle.tsx` | Serving runtime toggle — call site 1 |
| `packages/llmd-serving/src/settings/llmAcceleratorConfigs/LlmAcceleratorConfigEnabledToggle.tsx` | Accelerator config toggle — call site 2 |

---

## Deferred to follow-up PR: `Model Deployed` enhancement

The new deployment wizard has no tracking today. Adding `Model Deployed` tracking (with limited-support properties) requires more scoping — the legacy KServe modal is deprecated and should not be enhanced. This will be a separate PR.

### New properties (for reference)

| Property | Values |
|----------|--------|
| `supportStatus` | `'supported'` \| `'unsupported'` |
| `isFastRhaiisBuild` | `true` / `false` |
| `version` | string (from `opendatahub.io/runtime-version` annotation) |
| `fastVersion` | string (from `opendatahub.io/fast-version` annotation) |
| `runtimeResourceType` | `'serving-runtime-template'` \| `'llm-accelerator-config'` |
| `servingRuntimeTemplateId` | string |
| `acceleratorConfigurationId` | string |
| `deploymentMethod` | `'llm-inference-service'` \| `'llm-inference-service-llmd'` \| `'legacy'` |

---

## Struck through / out of scope

- ~~`Model Serving Unsupported Runtime Risk Accepted`~~ — not needed per Adam Bellusci
- ~~`Model Serving Fast RHAII Runtime Selected`~~ — covered by Model Deployed properties
- ~~Funnels~~ — composed in Amplitude, no code needed

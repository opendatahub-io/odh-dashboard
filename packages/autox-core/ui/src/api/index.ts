/**
 * Shared AutoX `api` layer.
 *
 * Contains raw HTTP/k8s fetch functions only — no React, no hooks. Mirrors the
 * `hooks/` folder 1:1 by domain (e.g. `api/k8s/*` <-> `hooks/k8s/*`), except
 * `hooks/common/`, which has no `api/common/` counterpart.
 *
 * `api/pipelines/kfTypes.ts` (KFP v2beta1 type subset) is intentionally NOT
 * re-exported here — it declares its own `PipelineSpec` (the full KFP pipeline
 * spec shape), which collides by name with this barrel's `PipelineSpec` (an
 * alias for `PipelineSpecVariable`). Import it via the dedicated
 * `@odh-dashboard/autox-core/ui/api/pipelines/kfTypes` subpath instead.
 *
 * See ../../ARCHITECTURE.md for the full layering conventions.
 */
export * from './k8s';
export * from './s3';
export * from './pipelines';

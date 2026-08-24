/**
 * Shared AutoX `api` layer.
 *
 * Contains raw HTTP/k8s fetch functions only — no React, no hooks. Mirrors the
 * `hooks/` folder 1:1 by domain (e.g. `api/k8s/*` <-> `hooks/k8s/*`), except
 * `hooks/common/`, which has no `api/common/` counterpart.
 *
 * See ../../ARCHITECTURE.md for the full layering conventions.
 */

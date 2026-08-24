/**
 * Shared AutoX `hooks` layer.
 *
 * React Query hooks (wrapping the `api/` layer) plus other reusable hooks,
 * grouped by domain folder (e.g. `hooks/k8s/useUser.ts`). `hooks/common/` holds
 * generic, non-domain-specific hooks with no `api/` counterpart.
 *
 * See ../../ARCHITECTURE.md for the full layering conventions.
 */
export {
  useBoundedCaptionHeight,
  getCaptionHeightBounds,
} from './topology/useBoundedCaptionHeight';

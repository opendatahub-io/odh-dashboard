import React from 'react';
import { ModelVersion } from '~/app/types';
type ModelVersionDeployActionProps = {
    mv: ModelVersion;
    renderAs?: 'button' | 'dropdown-item';
    onRenderModal?: (modal: React.ReactNode) => void;
};
/**
 * Self-contained deploy action component registered as `core.action`.
 *
 * Internally discovers the `model-registry.model-version/deploy-modal`
 * extension (provided by model-serving) to get platform availability
 * and the deploy modal. Renders nothing when no deploy extension is available.
 *
 * Accepts `renderAs` via componentProps to control rendering style:
 * - `'button'` (default) — standalone primary button with tooltip
 * - `'dropdown-item'` — `<DropdownItem>` + `<Divider>` for use inside a `<DropdownList>`
 */
declare const ModelVersionDeployAction: React.FC<ModelVersionDeployActionProps>;
export default ModelVersionDeployAction;

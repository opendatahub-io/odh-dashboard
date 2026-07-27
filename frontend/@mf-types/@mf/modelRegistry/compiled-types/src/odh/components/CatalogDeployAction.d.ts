import React from 'react';
import { CatalogModel } from '~/app/modelCatalogTypes';
type CatalogDeployActionProps = {
    model: CatalogModel;
};
/**
 * Self-contained deploy action for model catalog, registered as `core.action`.
 *
 * Internally discovers the `model-catalog.deployment/navigate-wizard` extension
 * (provided by model-serving) to navigate to the deployment wizard with
 * prefilled model data. Renders nothing when no wizard extension is available.
 */
declare const CatalogDeployAction: React.FC<CatalogDeployActionProps>;
export default CatalogDeployAction;

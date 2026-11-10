import type { DeployPrefillActionProps } from '@odh-dashboard/model-serving/shared/types/deploy-prefill';
import { CatalogArtifactList, CatalogModel } from '~/app/modelCatalogTypes';
declare const useCatalogDeployPrefillData: (model: CatalogModel | null | undefined, artifacts: CatalogArtifactList, artifactsLoaded: boolean, artifactsLoadError: Error | undefined, sourceId: string, modelName: string) => DeployPrefillActionProps;
export default useCatalogDeployPrefillData;

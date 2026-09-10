import React from 'react';
import type {
  DeployPrefillActionProps,
  DeployPrefillData,
} from '@odh-dashboard/model-serving/shared/types/deploy-prefill';
import { CatalogArtifactList, CatalogModel } from '~/app/modelCatalogTypes';
import { getCatalogModelDetailsRoute } from '~/app/routes/modelCatalog/catalogModelDetails';
import {
  getModelArtifactUri,
  getValidatedConfigurationsForModel,
} from '~/app/pages/modelCatalog/utils/modelCatalogUtils';
import useModelRegistryDashboardConfig from '~/app/hooks/useModelRegistryDashboardConfig';

const useCatalogDeployPrefillData = (
  model: CatalogModel | null | undefined,
  artifacts: CatalogArtifactList,
  artifactsLoaded: boolean,
  artifactsLoadError: Error | undefined,
  sourceId: string,
  modelName: string,
): DeployPrefillActionProps => {
  const { toolCalling: isToolCallingEnabled } = useModelRegistryDashboardConfig();
  const uri = artifacts.items.length > 0 ? getModelArtifactUri(artifacts.items) : '';
  const cancelReturnRoute = getCatalogModelDetailsRoute({
    sourceId,
    modelName,
  });

  const deployPrefill: DeployPrefillData = React.useMemo(() => {
    if (!model) {
      return {
        modelName: '',
        modelUri: uri,
      };
    }

    return {
      modelName: model.name,
      modelUri: uri,
      catalogModelId: [sourceId || model.source_id, model.name].filter(Boolean).join('/'),
      returnRouteValue: '/ai-hub/models/deployments/',
      cancelReturnRouteValue: cancelReturnRoute,
      wizardStartIndex: 1,
      prefillAlertText: `The ${model.name} model details have been imported from the model catalog.`,
      ...getValidatedConfigurationsForModel(model, isToolCallingEnabled),
    };
  }, [model, uri, cancelReturnRoute, isToolCallingEnabled, sourceId]);

  return {
    deployPrefill,
    deployPrefillLoaded: !!model && artifactsLoaded && !artifactsLoadError && !!uri,
    deployPrefillError: artifactsLoadError,
  };
};

export default useCatalogDeployPrefillData;

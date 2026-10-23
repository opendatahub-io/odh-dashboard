import React from 'react';
import type {
  DeployPrefillActionProps,
  DeployPrefillData,
} from '@odh-dashboard/model-serving/shared/types/deploy-prefill';
import { CatalogArtifactList, CatalogModel } from '~/app/modelCatalogTypes';
import { getCatalogModelDetailsRoute } from '~/app/routes/modelCatalog/catalogModelDetails';
import {
  getHfAccessType,
  getModelArtifactUri,
  getValidatedConfigurationsForModel,
} from '~/app/pages/modelCatalog/utils/modelCatalogUtils';
import {
  getModelCatalogIsAccessGranted,
  getModelCatalogTrackingHfAccessType,
} from '~/app/pages/modelCatalog/tracking/modelCatalogEngagementTracking';
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

    const hfAccessType = getHfAccessType(model);
    const requiresHuggingFaceApiKey =
      !!hfAccessType && (hfAccessType === 'private' || hfAccessType.startsWith('gated_'));
    const isGatedHuggingFace = !!hfAccessType && hfAccessType.startsWith('gated_');

    return {
      modelName: model.name,
      modelUri: uri,
      catalogModelId: [sourceId || model.source_id, model.name].filter(Boolean).join('/'),
      hfAccessType: getModelCatalogTrackingHfAccessType(model),
      isAccessGranted: getModelCatalogIsAccessGranted(model),
      returnRouteValue: '/ai-hub/models/deployments/',
      cancelReturnRouteValue: cancelReturnRoute,
      wizardStartIndex: 1,
      prefillAlertText: `The ${model.name} model details have been imported from the model catalog.`,
      ...getValidatedConfigurationsForModel(model, isToolCallingEnabled),
      requiresHuggingFaceApiKey,
      huggingFaceApiKeyAlertText: isGatedHuggingFace
        ? 'This model requires gated access on Hugging Face. Ensure your account has been granted access before deploying.'
        : undefined,
    };
  }, [model, uri, cancelReturnRoute, isToolCallingEnabled, sourceId]);

  return {
    deployPrefill,
    deployPrefillLoaded: !!model && artifactsLoaded && !artifactsLoadError && !!uri,
    deployPrefillError: artifactsLoadError,
  };
};

export default useCatalogDeployPrefillData;

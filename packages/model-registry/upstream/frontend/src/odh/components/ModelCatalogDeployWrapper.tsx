import React from 'react';
import { useParams } from 'react-router-dom';
import { HookNotify, useResolvedExtensions } from '@odh-dashboard/plugin-core';
import {
  isNavigateToDeploymentWizardWithDataExtension,
  DeployPrefillData,
} from '~/odh/extension-points';
import { CatalogModel, CatalogModelDetailsParams } from '~/app/modelCatalogTypes';
import { useCatalogModelArtifacts } from '~/app/hooks/modelCatalog/useCatalogModelArtifacts';
import { getCatalogModelDetailsRoute } from '~/app/routes/modelCatalog/catalogModelDetails';
import {
  decodeParams,
  getModelArtifactUri,
} from '~/app/pages/modelCatalog/utils/modelCatalogUtils';

type ModelCatalogDeployModalWrapperProps = {
  model: CatalogModel;
  render: (
    buttonState: { enabled?: boolean; tooltip?: string },
    onOpenWizard: () => void,
    isWizardAvailable: boolean,
  ) => React.ReactNode;
};

const ModelCatalogDeployModalWrapper: React.FC<ModelCatalogDeployModalWrapperProps> = ({
  model,
  render,
}) => {
  const params = useParams<CatalogModelDetailsParams>();
  const decodedParams = decodeParams(params);
  const [artifacts, artifactsLoaded, artifactsLoadError] = useCatalogModelArtifacts(
    decodedParams.sourceId || '',
    encodeURIComponent(`${decodedParams.modelName}`),
  );
  const uri = artifacts.items.length > 0 ? getModelArtifactUri(artifacts.items) : '';
  const cancelReturnRoute = getCatalogModelDetailsRoute({
    sourceId: decodedParams.sourceId,
    modelName: decodedParams.modelName,
  });

  const catalogDeployPrefillData: DeployPrefillData = React.useMemo(
    () => ({
      modelName: model.name,
      modelUri: uri,
      returnRouteValue: '/ai-hub/deployments/',
      cancelReturnRouteValue: cancelReturnRoute,
      wizardStartIndex: 2,
    }),
    [model.name, uri, cancelReturnRoute],
  );
  const [navigateExtensions, navigateExtensionsLoaded] = useResolvedExtensions(
    isNavigateToDeploymentWizardWithDataExtension,
  );
  const [navigateToWizard, setNavigateToWizard] = React.useState<(() => void) | null>(null);

  const onOpenWizard = React.useCallback(() => {
    if (navigateToWizard) {
      navigateToWizard();
    }
  }, [navigateToWizard]);

  const isWizardAvailable = React.useMemo(() => {
    return navigateExtensionsLoaded && navigateExtensions.length > 0;
  }, [navigateExtensions, navigateExtensionsLoaded]);

  const buttonState =
    navigateExtensionsLoaded &&
    navigateExtensions.length > 0 &&
    artifactsLoaded &&
    !artifactsLoadError
      ? { enabled: true }
      : { enabled: false, tooltip: 'Deployment wizard is not available' };

  return (
    <>
      {/* Get navigation function */}
      {navigateExtensionsLoaded &&
        navigateExtensions.length > 0 &&
        navigateExtensions.map((extension) => {
          if (!extension.properties.useNavigateToDeploymentWizardWithData) {
            return null;
          }
          return (
            <HookNotify
              key={extension.uid}
              useHook={extension.properties.useNavigateToDeploymentWizardWithData}
              args={[catalogDeployPrefillData]}
              onNotify={(fn) => {
                if (fn && typeof fn === 'function') {
                  setNavigateToWizard(() => fn);
                }
              }}
            />
          );
        })}
      {render(buttonState, onOpenWizard, isWizardAvailable)}
    </>
  );
};

export default ModelCatalogDeployModalWrapper;

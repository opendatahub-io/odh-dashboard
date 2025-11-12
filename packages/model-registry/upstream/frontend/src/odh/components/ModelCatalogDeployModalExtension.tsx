import React from 'react';
import { useParams } from 'react-router-dom';
import { HookNotify, useResolvedExtensions } from '@odh-dashboard/plugin-core';
import {
  isNavigateToDeploymentWizardWithDataExtension,
  DeployPrefillData,
} from '~/odh/extension-points';
import { CatalogModel, CatalogModelDetailsParams } from '~/app/modelCatalogTypes';
import { useCatalogModelArtifacts } from '~/app/hooks/modelCatalog/useCatalogModelArtifacts';
import {
  decodeParams,
  getModelArtifactUri,
} from '~/app/pages/modelCatalog/utils/modelCatalogUtils';

type ModelCatalogDeployModalExtensionProps = {
  model: CatalogModel;
  render: (
    buttonState: { enabled?: boolean; tooltip?: string },
    onOpenModal: () => void,
    isModalAvailable: boolean,
  ) => React.ReactNode;
};

const ModelCatalogDeployModalExtension: React.FC<ModelCatalogDeployModalExtensionProps> = ({
  model,
  render,
}) => {
  const params = useParams<CatalogModelDetailsParams>();
  const decodedParams = decodeParams(params);
  const [artifacts] = useCatalogModelArtifacts(
    decodedParams.sourceId || '',
    encodeURIComponent(`${decodedParams.modelName}`),
  );
  const uri = artifacts.items.length > 0 ? getModelArtifactUri(artifacts.items) : '';

  const catalogDeployPrefillData: DeployPrefillData = React.useMemo(
    () => ({
      modelName: model.name,
      modelUri: uri,
      returnRouteValue: '/ai-hub/deployments/',
      wizardStartIndex: 2,
    }),
    [model.name, uri],
  );
  const [navigateExtensions, navigateExtensionsLoaded] = useResolvedExtensions(
    isNavigateToDeploymentWizardWithDataExtension,
  );
  const [navigateToWizard, setNavigateToWizard] = React.useState<(() => void) | null>(null);

  const onOpenModal = React.useCallback(() => {
    if (navigateToWizard) {
      navigateToWizard();
    }
  }, [navigateToWizard]);

  const isModalAvailable = React.useMemo(() => {
    return navigateExtensionsLoaded && navigateExtensions.length > 0;
  }, [navigateExtensions, navigateExtensionsLoaded]);

  const buttonState =
    navigateExtensionsLoaded && navigateExtensions.length > 0
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
      {render(buttonState, onOpenModal, isModalAvailable)}
    </>
  );
};

export default ModelCatalogDeployModalExtension;

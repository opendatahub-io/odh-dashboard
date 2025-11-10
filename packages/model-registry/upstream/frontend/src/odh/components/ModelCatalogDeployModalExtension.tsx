import React from 'react';
import { useParams } from 'react-router-dom';
import { HookNotify, useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { isModelCatalogDeployModalExtension } from '~/odh/extension-points';
import { CatalogModel, CatalogModelDetailsParams } from '~/app/modelCatalogTypes';
import { getDeployButtonState } from '~/odh/utils';
import { useCatalogModelArtifacts } from '~/app/hooks/modelCatalog/useCatalogModelArtifacts';
import {
  decodeParams,
  getModelArtifactUri,
} from '~/app/pages/modelCatalog/utils/modelCatalogUtils';
import {
  isNavigateToWizardExtension,
  Deployment,
  InitialWizardFormData,
} from '../extension-points/model-catalog-deploy';
import { extractExternalFormData } from '../extractExternalFormData';

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
  const [navigateExtensions, navigateExtensionsLoaded] = useResolvedExtensions(
    isNavigateToWizardExtension,
  );
  const [navigateToWizard, setNavigateToWizard] = React.useState<
    | ((
        deployment?: Deployment | null,
        initialData?: InitialWizardFormData | null,
        returnRouteValue?: string,
      ) => (projectName?: string) => void)
    | null
  >(null);
  const [platformExtensions] = useResolvedExtensions(isModelCatalogDeployModalExtension);
  const [availablePlatformIds, setAvailablePlatformIds] = React.useState<string[]>([]);
  const buttonState = getDeployButtonState(availablePlatformIds, true);

  const params = useParams<CatalogModelDetailsParams>();
  const decodedParams = decodeParams(params);
  const [artifacts] = useCatalogModelArtifacts(
    decodedParams.sourceId || '',
    encodeURIComponent(`${decodedParams.modelName}`),
  );
  const uri = artifacts.items.length > 0 ? getModelArtifactUri(artifacts.items) : '';

  const wizardInitialData = React.useMemo(
    () => extractExternalFormData(uri, model.name),
    [uri, model.name],
  );
  const onOpenModal = React.useCallback(() => {
    if (navigateToWizard) {
      navigateToWizard();
    }
  }, [navigateToWizard]);

  return (
    <>
      {/* Get platform IDs */}
      {platformExtensions.map((extension) => {
        return (
          extension.properties.useAvailablePlatformIds && (
            <HookNotify
              key={extension.uid}
              useHook={extension.properties.useAvailablePlatformIds}
              onNotify={(value) => setAvailablePlatformIds(value ?? [])}
            />
          )
        );
      })}
      {/* Get navigation function */}
      {navigateExtensionsLoaded &&
        navigateExtensions.length > 0 &&
        navigateExtensions.map((extension) => (
          <HookNotify
            key={extension.uid}
            useHook={extension.properties.useNavigateToDeploymentWizard}
            args={[undefined, wizardInitialData, '/ai-hub/deployments/']}
            onNotify={(fn) => {
              if (fn && typeof fn === 'function') {
                setNavigateToWizard(() => fn);
              }
            }}
          />
        ))}
      {render(buttonState, onOpenModal, navigateExtensionsLoaded && !!navigateToWizard)}
    </>
  );
};

export default ModelCatalogDeployModalExtension;

import React from 'react';
import { useParams } from 'react-router-dom';
import { Button, ButtonVariant, Tooltip } from '@patternfly/react-core';
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
import { getDeployButtonState } from '~/odh/utils';

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
const CatalogDeployAction: React.FC<CatalogDeployActionProps> = ({ model }) => {
  const params = useParams<CatalogModelDetailsParams>();
  const decodedParams = decodeParams(params);
  const [artifacts, artifactsLoaded, artifactsLoadError] = useCatalogModelArtifacts(
    decodedParams.sourceId || '',
    encodeURIComponent(`${decodedParams.modelName}`),
  );
  const [availablePlatformIds, setAvailablePlatformIds] = React.useState<string[]>([]);
  const platformIdButtonState = React.useMemo(
    () => getDeployButtonState(availablePlatformIds, true),
    [availablePlatformIds],
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
      returnRouteValue: '/ai-hub/models/deployments/',
      cancelReturnRouteValue: cancelReturnRoute,
      wizardStartIndex: 1,
      prefillAlertText: `The ${model.name} model details have been imported from the model catalog.`,
    }),
    [model.name, uri, cancelReturnRoute],
  );

  const [navigateExtensions, navigateExtensionsLoaded] = useResolvedExtensions(
    isNavigateToDeploymentWizardWithDataExtension,
  );
  const [navigateToWizard, setNavigateToWizard] = React.useState<(() => void) | null>(null);

  const isWizardAvailable = navigateExtensionsLoaded && navigateExtensions.length > 0;

  const canInitializeWizardNavigation =
    isWizardAvailable && artifactsLoaded && !artifactsLoadError && !!uri;

  const isLoading = canInitializeWizardNavigation && navigateToWizard === null;

  const buttonState =
    platformIdButtonState.enabled && canInitializeWizardNavigation && navigateToWizard !== null
      ? { enabled: true }
      : {
          enabled: false,
          tooltip: isLoading
            ? 'Loading deployment data...'
            : platformIdButtonState.tooltip || 'Deployment wizard is not available',
        };

  if (!isWizardAvailable) {
    return null;
  }

  const deployButton = (
    <Button
      id="deploy-button"
      aria-label="Deploy model"
      variant={ButtonVariant.primary}
      onClick={buttonState.enabled && navigateToWizard ? () => navigateToWizard() : undefined}
      isAriaDisabled={!buttonState.enabled}
      data-testid="deploy-button"
    >
      Deploy model
    </Button>
  );

  return (
    <>
      {navigateExtensions.map((extension) => (
        <HookNotify
          key={extension.uid}
          useHook={extension.properties.useAvailablePlatformIds}
          onNotify={(value) => setAvailablePlatformIds(value ?? [])}
        />
      ))}
      {canInitializeWizardNavigation &&
        navigateExtensions.map((extension) => (
          <HookNotify
            key={extension.uid}
            useHook={extension.properties.useNavigateToDeploymentWizardWithData}
            args={[catalogDeployPrefillData]}
            onNotify={(fn) => {
              if (fn && typeof fn === 'function') {
                setNavigateToWizard(() => fn);
              } else {
                setNavigateToWizard(null);
              }
            }}
          />
        ))}
      {buttonState.tooltip ? (
        <Tooltip content={buttonState.tooltip}>{deployButton}</Tooltip>
      ) : (
        deployButton
      )}
    </>
  );
};

export default CatalogDeployAction;

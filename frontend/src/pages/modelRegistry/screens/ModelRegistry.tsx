import React from 'react';
import { Link } from 'react-router-dom';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
  EmptyStateVariant,
  PageSection,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import {
  modelRegistryRoute,
  modelRegistrySettingsRoute,
} from '#~/routes/modelRegistry/registryBase';
import useRegisteredModels from '#~/concepts/modelRegistry/apiHooks/useRegisteredModels';
import useModelVersions from '#~/concepts/modelRegistry/apiHooks/useModelVersions';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import WhosMyAdministrator from '#~/components/WhosMyAdministrator';
import { useAccessAllowed, verbModelAccess } from '#~/concepts/userSSAR';
import { ModelRegistryModel } from '#~/api/models';
import RegisteredModelListView from './RegisteredModels/RegisteredModelListView';
import ModelRegistrySelectorNavigator from './ModelRegistrySelectorNavigator';

type ModelRegistryProps = Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  | 'title'
  | 'description'
  | 'loadError'
  | 'loaded'
  | 'provideChildrenPadding'
  | 'removeChildrenTopPadding'
  | 'headerContent'
>;

const ModelRegistry: React.FC<ModelRegistryProps> = ({ ...pageProps }) => {
  const [registeredModels, modelsLoaded, modelsLoadError, refreshModels] = useRegisteredModels();
  const [modelVersions, versionsLoaded, versionsLoadError, refreshVersions] = useModelVersions();
  const [isAdmin] = useAccessAllowed(verbModelAccess('create', ModelRegistryModel));

  const loaded = modelsLoaded && versionsLoaded;
  const loadError = modelsLoadError || versionsLoadError;

  const refresh = React.useCallback(() => {
    refreshModels();
    refreshVersions();
  }, [refreshModels, refreshVersions]);

  const loadErrorPage = loadError ? (
    <PageSection hasBodyWrapper={false} isFilled>
      <EmptyState
        headingLevel="h1"
        icon={ExclamationCircleIcon}
        titleText="Model registry unavailable"
        variant={EmptyStateVariant.lg}
        data-testid="model-registry-unavailable-error"
      >
        <EmptyStateBody>
          {isAdmin
            ? 'The model registry is unavailable. Check the registry configuration in settings to troubleshoot the issue.'
            : 'The model registry is unavailable. If the problem persists, contact your administrator.'}
        </EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            {isAdmin ? (
              <Link to={modelRegistrySettingsRoute()}>
                Go to <b>AI registry settings</b>
              </Link>
            ) : (
              <WhosMyAdministrator />
            )}
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </PageSection>
  ) : undefined;

  return (
    <ApplicationsPage
      {...pageProps}
      title={<TitleWithIcon title="Registry" objectType={ProjectObjectType.registeredModels} />}
      description="Select a model registry to view and manage your registered models. Model registries provide a structured and organized way to store, share, version, deploy, and track models."
      headerContent={
        <ModelRegistrySelectorNavigator
          getRedirectPath={(modelRegistryName) => modelRegistryRoute(modelRegistryName)}
        />
      }
      loadError={loadError}
      loadErrorPage={loadErrorPage}
      loaded={loaded}
      provideChildrenPadding
      removeChildrenTopPadding
    >
      <RegisteredModelListView
        registeredModels={registeredModels.items}
        modelVersions={modelVersions.items}
        refresh={refresh}
      />
    </ApplicationsPage>
  );
};

export default ModelRegistry;

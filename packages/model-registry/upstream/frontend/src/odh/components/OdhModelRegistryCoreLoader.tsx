import * as React from 'react';
import { CogIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
  EmptyStateVariant,
  PageSection,
} from '@patternfly/react-core';
import { ProjectObjectType, typedEmptyImage, WhosMyAdministrator } from 'mod-arch-shared';
import { useResolvedExtensions, useExtensions } from '@odh-dashboard/plugin-core';
import EmptyModelRegistryState from '~/app/pages/modelRegistry/screens/components/EmptyModelRegistryState';
import ModelRegistryCoreLoader from '~/app/pages/modelRegistry/ModelRegistryCoreLoader';
import { isAdminCheckExtension, isRegistrySettingsUrlExtension } from '~/odh/extension-points';
import { REGISTRY_SETTINGS_PAGE_TITLE, REGISTRY_SETTINGS_URL } from '~/odh/const';

type OdhUnavailableModelRegistryProps = {
  registryDisplayName: string;
  isAdmin: boolean;
  settingsUrl: string;
  settingsTitle: string;
};

const OdhUnavailableModelRegistry: React.FC<OdhUnavailableModelRegistryProps> = ({
  registryDisplayName,
  isAdmin,
  settingsUrl,
  settingsTitle,
}) => (
  <PageSection hasBodyWrapper={false} isFilled data-testid="unavailable-model-registry">
    <EmptyState
      headingLevel="h1"
      icon={ExclamationCircleIcon}
      titleText="Model registry unavailable"
      variant={EmptyStateVariant.lg}
    >
      <EmptyStateBody>
        {isAdmin
          ? `The ${registryDisplayName} registry is currently unavailable. Check the registry configuration in settings to troubleshoot the issue.`
          : `The ${registryDisplayName} registry is currently unavailable. It might still be starting up, or there might be a configuration error. Wait a few minutes and try again. If the problem persists, contact your administrator.`}
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          {isAdmin ? (
            <Link to={settingsUrl} data-testid="registry-settings-link">
              Go to <b>{settingsTitle}</b>
            </Link>
          ) : (
            <WhosMyAdministrator linkTestId="whos-my-admin-link" />
          )}
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  </PageSection>
);

type OdhModelRegistryCoreLoaderProps = {
  getInvalidRedirectPath: (modelRegistry: string) => string;
};

/**
 * ODH-specific override of ModelRegistryCoreLoader that includes admin user detection
 * for showing appropriate empty and unavailable states.
 */
const OdhModelRegistryCoreLoader: React.FC<OdhModelRegistryCoreLoaderProps> = ({
  getInvalidRedirectPath,
}) => {
  const [adminCheckExtensions, adminCheckExtensionsLoaded] =
    useResolvedExtensions(isAdminCheckExtension);
  const registrySettingsUrlExtensions = useExtensions(isRegistrySettingsUrlExtension);

  const settingsUrl =
    registrySettingsUrlExtensions.length > 0
      ? registrySettingsUrlExtensions[0].properties.url
      : REGISTRY_SETTINGS_URL;

  const settingsTitle =
    registrySettingsUrlExtensions.length > 0
      ? registrySettingsUrlExtensions[0].properties.title
      : REGISTRY_SETTINGS_PAGE_TITLE;

  const createEmptyStatePage = (isAdmin: boolean) => {
    const adminTitle = 'Create a model registry';
    const adminDescription =
      'No model registries are available to users in your organization. Create a model registry from the Model registry settings page.';

    const userTitle = 'Request access to model registries';
    const userDescription =
      'To request a new model registry, or to request permission to access an existing model registry, contact your administrator.';

    return (
      <EmptyModelRegistryState
        testid="empty-model-registries-state"
        title={isAdmin ? adminTitle : userTitle}
        description={isAdmin ? adminDescription : userDescription}
        headerIcon={() =>
          !isAdmin ? (
            <img src={typedEmptyImage(ProjectObjectType.registeredModels)} alt="" />
          ) : (
            <CogIcon />
          )
        }
        customAction={
          !isAdmin ? (
            <WhosMyAdministrator />
          ) : (
            <Link to={settingsUrl}>
              Go to <b>{settingsTitle}</b>
            </Link>
          )
        }
      />
    );
  };

  const createUnavailableStatePage = (isAdmin: boolean) => {
    const renderUnavailablePage = (registryDisplayName: string): React.ReactNode => (
      <OdhUnavailableModelRegistry
        registryDisplayName={registryDisplayName}
        isAdmin={isAdmin}
        settingsUrl={settingsUrl}
        settingsTitle={settingsTitle}
      />
    );
    return renderUnavailablePage;
  };

  if (adminCheckExtensionsLoaded && adminCheckExtensions.length > 0) {
    const AdminCheckComponent = adminCheckExtensions[0].properties.component.default;
    return (
      <AdminCheckComponent>
        {(isAdmin: boolean, loaded: boolean) => {
          if (!loaded) {
            return <Bullseye>Loading...</Bullseye>;
          }
          return (
            <ModelRegistryCoreLoader
              getInvalidRedirectPath={getInvalidRedirectPath}
              emptyStatePage={createEmptyStatePage(isAdmin)}
              unavailableStatePage={createUnavailableStatePage(isAdmin)}
            />
          );
        }}
      </AdminCheckComponent>
    );
  }

  return (
    <ModelRegistryCoreLoader
      getInvalidRedirectPath={getInvalidRedirectPath}
      emptyStatePage={createEmptyStatePage(false)}
      unavailableStatePage={createUnavailableStatePage(false)}
    />
  );
};

export default OdhModelRegistryCoreLoader;

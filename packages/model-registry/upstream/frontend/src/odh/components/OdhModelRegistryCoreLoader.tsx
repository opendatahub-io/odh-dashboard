import * as React from 'react';
import { CogIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { Bullseye } from '@patternfly/react-core';
import { ProjectObjectType, typedEmptyImage, WhosMyAdministrator } from 'mod-arch-shared';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import EmptyModelRegistryState from '~/app/pages/modelRegistry/screens/components/EmptyModelRegistryState';
import ModelRegistryCoreLoader from '~/app/pages/modelRegistry/ModelRegistryCoreLoader';
import { isAdminCheckExtension } from '~/odh/extension-points';

type OdhModelRegistryCoreLoaderProps = {
  getInvalidRedirectPath: (modelRegistry: string) => string;
};

/**
 * ODH-specific override of ModelRegistryCoreLoader that includes admin user detection
 * for showing appropriate empty states when no model registries are available.
 */
const OdhModelRegistryCoreLoader: React.FC<OdhModelRegistryCoreLoaderProps> = ({
  getInvalidRedirectPath,
}) => {
  const [adminCheckExtensions, adminCheckExtensionsLoaded] =
    useResolvedExtensions(isAdminCheckExtension);

  // Create the ODH-specific empty state based on admin status
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
            <Link to="/settings/model-resources-operations/model-registry">
              Go to <b>Model registry settings</b>
            </Link>
          )
        }
      />
    );
  };

  // If an admin check extension is provided and loaded, use it
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
            />
          );
        }}
      </AdminCheckComponent>
    );
  }

  // Fallback: no admin check extension, default to non-admin view
  return (
    <ModelRegistryCoreLoader
      getInvalidRedirectPath={getInvalidRedirectPath}
      emptyStatePage={createEmptyStatePage(false)}
    />
  );
};

export default OdhModelRegistryCoreLoader;

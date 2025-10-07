import * as React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { Bullseye, Alert, Divider, Stack, StackItem } from '@patternfly/react-core';
import { CogIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import {
  ProjectObjectType,
  typedEmptyImage,
  TitleWithIcon,
  WhosMyAdministrator,
  ApplicationsPage,
} from 'mod-arch-shared';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';
import { ModelRegistryContextProvider } from '~/app/context/ModelRegistryContext';
import EmptyModelRegistryState from '~/app/pages/modelRegistry/screens/components/EmptyModelRegistryState';
import InvalidModelRegistry from '~/app/pages/modelRegistry/screens/InvalidModelRegistry';
import ModelRegistrySelectorNavigator from '~/app/pages/modelRegistry/screens/ModelRegistrySelectorNavigator';
import { modelRegistryUrl } from '~/app/pages/modelRegistry/screens/routeUtils';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;

type OdhModelRegistryCoreLoaderProps = {
  getInvalidRedirectPath: (modelRegistry: string) => string;
  isAdminUser?: boolean;
};

type ApplicationPageRenderState = Pick<
  ApplicationPageProps,
  'emptyStatePage' | 'empty' | 'headerContent'
>;

/**
 * ODH-specific override of ModelRegistryCoreLoader that includes admin user detection
 * for showing appropriate empty states when no model registries are available.
 */
const OdhModelRegistryCoreLoader: React.FC<OdhModelRegistryCoreLoaderProps> = ({
  getInvalidRedirectPath,
  isAdminUser,
}) => {
  const { modelRegistry } = useParams<{ modelRegistry: string }>();
  let {
    modelRegistriesLoaded,
    modelRegistriesLoadError,
    modelRegistries,
    preferredModelRegistry,
    updatePreferredModelRegistry,
  } = React.useContext(ModelRegistrySelectorContext);

  const modelRegistryFromRoute = modelRegistries.find((mr) => mr.name === modelRegistry);

  React.useEffect(() => {
    if (modelRegistryFromRoute && preferredModelRegistry?.name !== modelRegistryFromRoute.name) {
      updatePreferredModelRegistry(modelRegistryFromRoute);
    }
  }, [modelRegistryFromRoute, updatePreferredModelRegistry, preferredModelRegistry?.name]);

  if (modelRegistriesLoadError) {
    return (
      <Bullseye>
        <Alert title="Model registry load error" variant="danger" isInline>
          {modelRegistriesLoadError.message}
        </Alert>
      </Bullseye>
    );
  }
  if (!modelRegistriesLoaded) {
    return <Bullseye>Loading model registries...</Bullseye>;
  }

  let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };
  if (modelRegistries.length === 0) {
    // ODH-specific admin vs user empty states
    const adminTitle = 'Create a model registry';
    const adminDescription =
      'No model registries are available to users in your organization. Create a model registry from the Model registry settings page.';

    const userTitle = 'Request access to model registries';
    const userDescription =
      'To request a new model registry, or to request permission to access an existing model registry, contact your administrator.';

    renderStateProps = {
      empty: true,
      emptyStatePage: (
        <EmptyModelRegistryState
          testid="empty-model-registries-state"
          title={isAdminUser ? adminTitle : userTitle}
          description={isAdminUser ? adminDescription : userDescription}
          headerIcon={() =>
            !isAdminUser ? (
              <img src={typedEmptyImage(ProjectObjectType.registeredModels)} alt="" />
            ) : (
              <CogIcon />
            )
          }
          customAction={
            !isAdminUser ? (
              <WhosMyAdministrator />
            ) : (
              <Link to="/settings/model-resources-operations/model-registry">
                Go to <b>Model registry settings</b>
              </Link>
            )
          }
        />
      ),
      headerContent: null,
    };
  } else if (modelRegistry) {
    const foundModelRegistry = modelRegistries.find((mr) => mr.name === modelRegistry);
    if (foundModelRegistry) {
      // Render the content
      return (
        <ModelRegistryContextProvider modelRegistryName={modelRegistry}>
          <Outlet />
        </ModelRegistryContextProvider>
      );
    }
    // They ended up on a non-valid project path
    renderStateProps = {
      empty: true,
      emptyStatePage: <InvalidModelRegistry modelRegistry={modelRegistry} />,
    };
  } else {
    // Redirect the namespace suffix into the URL
    const redirectModelRegistry = preferredModelRegistry ?? modelRegistries[0];
    return <Navigate to={getInvalidRedirectPath(redirectModelRegistry.name)} replace />;
  }

  return (
    <ApplicationsPage
      title={<TitleWithIcon title="Registry" objectType={ProjectObjectType.registeredModels} />}
      description={
        <Stack hasGutter>
          <StackItem>
            Select a model registry to view and manage your registered models. Model registries
            provide a structured and organized way to store, share, version, deploy, and track
            models.
          </StackItem>
          <StackItem>
            <Divider />
          </StackItem>
        </Stack>
      }
      headerContent={
        <ModelRegistrySelectorNavigator
          getRedirectPath={(modelRegistryName) => modelRegistryUrl(modelRegistryName)}
        />
      }
      {...renderStateProps}
      loaded
      provideChildrenPadding
    />
  );
};

export default OdhModelRegistryCoreLoader;

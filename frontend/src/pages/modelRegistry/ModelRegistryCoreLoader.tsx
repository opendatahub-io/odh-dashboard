import * as React from 'react';
import { Navigate, Outlet, useParams } from 'react-router';
import { ModelRegistryContextProvider } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import ApplicationsPage from '~/pages/ApplicationsPage';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '~/concepts/design/utils';

import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import InvalidModelRegistry from './screens/InvalidModelRegistry';
import EmptyModelRegistryState from './screens/EmptyModelRegistryState';
import ModelRegistrySelectorNavigator from './screens/ModelRegistrySelectorNavigator';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;
type EmptyStateProps = 'emptyStatePage' | 'empty';

type ModelRegistryCoreLoaderProps = {
  getInvalidRedirectPath: (modelRegistry: string) => string;
};

type ApplicationPageRenderState = Pick<ApplicationPageProps, EmptyStateProps>;

const ModelRegistryCoreLoader: React.FC<ModelRegistryCoreLoaderProps> = ({
  getInvalidRedirectPath,
}) => {
  const { modelRegistry } = useParams<{ modelRegistry: string }>();
  const { modelRegistries, preferredModelRegistry } = React.useContext(
    ModelRegistrySelectorContext,
  );

  let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };
  if (modelRegistries.length === 0) {
    renderStateProps = {
      empty: true,
      emptyStatePage: (
        // TODO: Replace this with a component for empty registries once we have the designs
        <EmptyModelRegistryState
          title="No model registries found"
          description="No model registries found in the cluster. Configure a new one before registering models."
          primaryActionText="Configure model registry"
          primaryActionOnClick={() => {
            // TODO: Add primary action
          }}
        />
      ),
    };
  } else if (modelRegistry) {
    const foundModelRegistry = modelRegistries.find((mr) => mr.metadata.name === modelRegistry);
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
    return <Navigate to={getInvalidRedirectPath(redirectModelRegistry.metadata.name)} replace />;
  }

  return (
    <ApplicationsPage
      title={
        <TitleWithIcon title="Registered models" objectType={ProjectObjectType.registeredModels} />
      }
      {...renderStateProps}
      loaded
      headerContent={
        <ModelRegistrySelectorNavigator
          getRedirectPath={(modelRegistryName) => `/modelRegistry/${modelRegistryName}`}
        />
      }
      provideChildrenPadding
    />
  );
};

export default ModelRegistryCoreLoader;

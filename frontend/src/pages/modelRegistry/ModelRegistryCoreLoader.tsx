import * as React from 'react';
import { Navigate, Outlet, useParams } from 'react-router';
import { Bullseye } from '@patternfly/react-core';
import { conditionalArea, SupportedArea } from '~/concepts/areas';
import { ModelRegistryContextProvider } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import ApplicationsPage from '~/pages/ApplicationsPage';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import WhosMyAdministrator from '~/components/WhosMyAdministrator';
import { modelRegistryRoute } from '~/routes/modelRegistry/registryBase';
import RedirectErrorState from '~/pages/external/RedirectErrorState';
import InvalidModelRegistry from './screens/InvalidModelRegistry';
import EmptyModelRegistryState from './screens/components/EmptyModelRegistryState';
import ModelRegistrySelectorNavigator from './screens/ModelRegistrySelectorNavigator';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;

type ModelRegistryCoreLoaderProps = {
  getInvalidRedirectPath: (modelRegistry: string) => string;
};

type ApplicationPageRenderState = Pick<
  ApplicationPageProps,
  'emptyStatePage' | 'empty' | 'headerContent'
>;

const ModelRegistryCoreLoader: React.FC<ModelRegistryCoreLoaderProps> =
  conditionalArea<ModelRegistryCoreLoaderProps>(
    SupportedArea.MODEL_REGISTRY,
    true,
  )(({ getInvalidRedirectPath }) => {
    const { modelRegistry } = useParams<{ modelRegistry: string }>();
    const {
      modelRegistryServicesLoaded,
      modelRegistryServicesLoadError,
      modelRegistryServices,
      preferredModelRegistry,
      updatePreferredModelRegistry,
    } = React.useContext(ModelRegistrySelectorContext);
    const modelRegistryFromRoute = modelRegistryServices.find(
      (mr) => mr.metadata.name === modelRegistry,
    );

    React.useEffect(() => {
      if (
        modelRegistryFromRoute &&
        preferredModelRegistry?.metadata.name !== modelRegistryFromRoute.metadata.name
      ) {
        updatePreferredModelRegistry(modelRegistryFromRoute);
      }
    }, [
      modelRegistryFromRoute,
      updatePreferredModelRegistry,
      preferredModelRegistry?.metadata.name,
    ]);

    if (modelRegistryServicesLoadError) {
      return (
        <ApplicationsPage loaded loadError={modelRegistryServicesLoadError} empty={false}>
          <RedirectErrorState
            title="Model registry load error"
            errorMessage={modelRegistryServicesLoadError.message}
          />
        </ApplicationsPage>
      );
    }
    if (!modelRegistryServicesLoaded) {
      return <Bullseye>Loading model registries...</Bullseye>;
    }

    let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };
    if (modelRegistryServices.length === 0) {
      renderStateProps = {
        empty: true,
        emptyStatePage: (
          <EmptyModelRegistryState
            testid="empty-model-registries-state"
            title="Request access to model registries"
            description="To request a new model registry, or to request permission to access an existing model registry, contact your administrator."
            headerIcon={() => (
              <img src={typedEmptyImage(ProjectObjectType.registeredModels)} alt="" />
            )}
            customAction={<WhosMyAdministrator />}
          />
        ),
        headerContent: null,
      };
    } else if (modelRegistry) {
      const foundModelRegistry = modelRegistryServices.find(
        (mr) => mr.metadata.name === modelRegistry,
      );
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
      const redirectModelRegistry = preferredModelRegistry ?? modelRegistryServices[0];
      return <Navigate to={getInvalidRedirectPath(redirectModelRegistry.metadata.name)} replace />;
    }

    return (
      <ApplicationsPage
        title={
          <TitleWithIcon title="Model registry" objectType={ProjectObjectType.registeredModels} />
        }
        description="Select a model registry to view and manage your registered models. Model registries provide a structured and organized way to store, share, version, deploy, and track models."
        headerContent={
          <ModelRegistrySelectorNavigator
            getRedirectPath={(modelRegistryName) => modelRegistryRoute(modelRegistryName)}
          />
        }
        {...renderStateProps}
        loaded
        provideChildrenPadding
      />
    );
  });

export default ModelRegistryCoreLoader;

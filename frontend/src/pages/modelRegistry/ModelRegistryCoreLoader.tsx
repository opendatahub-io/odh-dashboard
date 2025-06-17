import * as React from 'react';
import { Navigate, Outlet, useParams } from 'react-router';
import { Bullseye } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { CogIcon } from '@patternfly/react-icons';
import { conditionalArea, SupportedArea } from '#~/concepts/areas';
import { ModelRegistryPageContextProvider } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType, typedEmptyImage } from '#~/concepts/design/utils';
import { ModelRegistriesContext } from '#~/concepts/modelRegistry/context/ModelRegistriesContext';
import WhosMyAdministrator from '#~/components/WhosMyAdministrator';
import { modelRegistryRoute } from '#~/routes/modelRegistry/registryBase';
import RedirectErrorState from '#~/pages/external/RedirectErrorState';
import { useAccessAllowed, verbModelAccess } from '#~/concepts/userSSAR';
import { ModelRegistryModel } from '#~/api/models';
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
    const [isAdmin] = useAccessAllowed(verbModelAccess('create', ModelRegistryModel));
    const {
      modelRegistryServicesLoaded,
      modelRegistryServicesLoadError,
      modelRegistryServices,
      preferredModelRegistry,
      updatePreferredModelRegistry,
    } = React.useContext(ModelRegistriesContext);
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
      const adminTitle = 'Create a model registry';
      const adminDescription = (
        <>
          No model registries are available to users in your organization. Create a model registry
          from the <b>Model registry settings</b> page.
        </>
      );

      const userTitle = 'Request access to model registries';
      const userDescription =
        'To request a new model registry, or to request permission to access an existing model registry, contact your administrator.';

      renderStateProps = {
        empty: true,
        emptyStatePage: (
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
                <Link to="/modelRegistrySettings">
                  Go to <b>Model registry settings</b>
                </Link>
              )
            }
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
          <ModelRegistryPageContextProvider modelRegistryName={modelRegistry}>
            <Outlet />
          </ModelRegistryPageContextProvider>
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

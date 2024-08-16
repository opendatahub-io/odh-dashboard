import * as React from 'react';
import { Navigate, Outlet, useParams } from 'react-router';

import { Bullseye, Alert, Popover, List, ListItem, Button } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';

import { conditionalArea, SupportedArea } from '~/concepts/areas';
import { ModelRegistryContextProvider } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import ApplicationsPage from '~/pages/ApplicationsPage';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import InvalidModelRegistry from './screens/InvalidModelRegistry';
import EmptyModelRegistryState from './screens/components/EmptyModelRegistryState';
import ModelRegistrySelectorNavigator from './screens/ModelRegistrySelectorNavigator';
import { modelRegistryUrl } from './screens/routeUtils';

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
        <Bullseye>
          <Alert title="Model registry load error" variant="danger" isInline>
            {modelRegistryServicesLoadError.message}
          </Alert>
        </Bullseye>
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
            customAction={
              <Popover
                showClose
                position="bottom"
                headerContent="Your administrator might be:"
                bodyContent={
                  <List>
                    <ListItem>
                      The person who gave you your username, or who helped you to log in for the
                      first time
                    </ListItem>
                    <ListItem>Someone in your IT department or help desk</ListItem>
                    <ListItem>A project manager or developer</ListItem>
                  </List>
                }
              >
                <Button variant="link" icon={<OutlinedQuestionCircleIcon />}>
                  Who&apos;s my administrator?
                </Button>
              </Popover>
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
        description="View and manage all of your registered models. Registering models to model registry allows you to manage their content, metadata, versions, and user access settings."
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
  });

export default ModelRegistryCoreLoader;

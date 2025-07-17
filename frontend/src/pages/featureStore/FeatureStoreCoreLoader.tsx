import React from 'react';
import { Bullseye } from '@patternfly/react-core';
import { CogIcon } from '@patternfly/react-icons';
import { Outlet } from 'react-router';
import { FeatureStoreModel } from '#~/api/models/odh.ts';
import { conditionalArea } from '#~/concepts/areas/AreaComponent.tsx';
import { SupportedArea } from '#~/concepts/areas/types.ts';
import { useAccessAllowed, verbModelAccess } from '#~/concepts/userSSAR';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import WhosMyAdministrator from '#~/components/WhosMyAdministrator.tsx';
import { ProjectObjectType, typedEmptyImage } from '#~/concepts/design/utils.ts';
import {
  FeatureStoreProjectContext,
  FeatureStoreProjectContextProvider,
} from '#~/concepts/featureStore/context/FeatureStoreProjectContext.tsx';
import RedirectErrorState from '#~/pages/external/RedirectErrorState';
import EmptyStateFeatureStore from './screens/components/EmptyStateFeatureStore';
import FeatureStoreProjectSelectorNavigator from './screens/FeatureStoreProjectSelectorNavigator';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;

type FeatureStoreCoreLoaderProps = {
  getInvalidRedirectPath: (featureStoreProject: string) => string;
};

type ApplicationPageRenderState = Pick<
  ApplicationPageProps,
  'emptyStatePage' | 'empty' | 'headerContent'
>;

const FeatureStoreCoreLoader: React.FC<FeatureStoreCoreLoaderProps> =
  conditionalArea<FeatureStoreCoreLoaderProps>(
    SupportedArea.FEATURE_STORE,
    false,
  )(({ getInvalidRedirectPath }) => {
    const [isAdmin, isAdminLoaded] = useAccessAllowed(verbModelAccess('create', FeatureStoreModel));
    const { featureStoreProjectLoaded, featureStoreProjectLoadError, featureStoreProjects } =
      React.useContext(FeatureStoreProjectContext);

    if (featureStoreProjectLoadError) {
      return (
        <ApplicationsPage loaded loadError={featureStoreProjectLoadError} empty={false}>
          <RedirectErrorState
            title="Feature Store project load error"
            errorMessage={featureStoreProjectLoadError.message}
          />
        </ApplicationsPage>
      );
    }

    // Wait for both feature store project and admin permissions to load
    if (!featureStoreProjectLoaded || !isAdminLoaded) {
      return <Bullseye>Loading feature store projects...</Bullseye>;
    }

    let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };
    if (featureStoreProjects.length === 0) {
      const adminTitle = 'Create a Feature store project';
      const adminDescription = (
        <>
          No feature store projects are available to users in your organization. Create a Feature
          store project from the <b>OpenShift platform</b>.
        </>
      );

      const userTitle = 'Start by requesting a Feature Store project';
      const userDescription =
        'Feature Store projects allow you and your team to organize and collaborate on resources within separate namespaces. To request a project, contact your administrator.';
      renderStateProps = {
        empty: true,
        emptyStatePage: (
          <EmptyStateFeatureStore
            testid="empty-state-feature-store"
            title={isAdmin ? adminTitle : userTitle}
            description={isAdmin ? adminDescription : userDescription}
            headerIcon={() =>
              isAdmin ? (
                <CogIcon />
              ) : (
                // TODO: need to update with img from the design
                <img src={typedEmptyImage(ProjectObjectType.registeredModels)} alt="" />
              )
            }
            customAction={!isAdmin && <WhosMyAdministrator />}
          />
        ),
        headerContent: null,
      };
    } else {
      return (
        <FeatureStoreProjectContextProvider>
          <Outlet />
        </FeatureStoreProjectContextProvider>
      );
    }

    return (
      <ApplicationsPage
        title="Feature Store"
        description="A catalog of features, entities, feature views and datasets created by your own team"
        headerContent={
          <FeatureStoreProjectSelectorNavigator getRedirectPath={getInvalidRedirectPath} />
        }
        {...renderStateProps}
        loaded
        provideChildrenPadding
      />
    );
  });

export default FeatureStoreCoreLoader;

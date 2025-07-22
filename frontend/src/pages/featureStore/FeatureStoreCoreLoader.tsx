import React from 'react';
import { Bullseye } from '@patternfly/react-core';
import { CogIcon } from '@patternfly/react-icons';
import { Outlet } from 'react-router';
import { FeatureStoreModel } from '#~/api/models/odh';
import { conditionalArea } from '#~/concepts/areas/AreaComponent';
import { SupportedArea } from '#~/concepts/areas/types';
import { useAccessAllowed, verbModelAccess } from '#~/concepts/userSSAR';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import WhosMyAdministrator from '#~/components/WhosMyAdministrator';
import { ProjectObjectType, typedEmptyImage } from '#~/concepts/design/utils';
import RedirectErrorState from '#~/pages/external/RedirectErrorState';
import { useFeatureStoreCR } from '#~/pages/featureStore/apiHooks/useFeatureStoreCR';
import EmptyStateFeatureStore from './screens/components/EmptyStateFeatureStore';
import FeatureStoreProjectSelectorNavigator from './screens/components/FeatureStoreProjectSelectorNavigator';
import { featureStoreRoute } from './FeatureStoreRoutes';
import { FeatureStoreContextProvider } from './FeatureStoreContext';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;

type FeatureStoreCoreLoaderProps = Record<string, never>;

type ApplicationPageRenderState = Pick<
  ApplicationPageProps,
  'emptyStatePage' | 'empty' | 'headerContent'
>;

const FeatureStoreCoreLoader: React.FC<FeatureStoreCoreLoaderProps> =
  conditionalArea<FeatureStoreCoreLoaderProps>(
    SupportedArea.FEATURE_STORE,
    false,
  )(() => {
    const [isAdmin, isAdminLoaded] = useAccessAllowed(verbModelAccess('create', FeatureStoreModel));
    const {
      data: featureStoreCR,
      loaded: featureStoreCRLoaded,
      error: featureStoreCRError,
    } = useFeatureStoreCR();

    if (featureStoreCRError) {
      return (
        <ApplicationsPage loaded loadError={featureStoreCRError} empty={false}>
          <RedirectErrorState
            title="Feature Store project load error"
            errorMessage={featureStoreCRError.message}
          />
        </ApplicationsPage>
      );
    }

    // Wait for both feature store project and admin permissions to load
    if (!featureStoreCRLoaded || !isAdminLoaded) {
      return <Bullseye>Loading feature store projects...</Bullseye>;
    }

    let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };
    if (!featureStoreCR) {
      const adminTitle = 'Create a Feature store service';
      const adminDescription = (
        <>
          No feature store service is available to users in your organization. Create a Feature
          store service from the <b>OpenShift platform</b>.
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
        <FeatureStoreContextProvider>
          <Outlet />
        </FeatureStoreContextProvider>
      );
    }

    return (
      <ApplicationsPage
        title="Feature Store"
        description="A catalog of features, entities, feature views and datasets created by your own team"
        headerContent={
          <FeatureStoreProjectSelectorNavigator
            getRedirectPath={(featureStoreObject, featureStoreProject) =>
              featureStoreRoute(featureStoreObject, featureStoreProject)
            }
          />
        }
        {...renderStateProps}
        loaded
        provideChildrenPadding
      />
    );
  });

export default FeatureStoreCoreLoader;

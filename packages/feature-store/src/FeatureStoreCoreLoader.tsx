import React from 'react';
import { Bullseye } from '@patternfly/react-core';
import { CogIcon } from '@patternfly/react-icons';
import { Outlet, useParams } from 'react-router';
import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import { conditionalArea } from '@odh-dashboard/internal/concepts/areas/AreaComponent';
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import WhosMyAdministrator from '@odh-dashboard/internal/components/WhosMyAdministrator';
import RedirectErrorState from '@odh-dashboard/internal/pages/external/RedirectErrorState';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import { verbModelAccess } from '@odh-dashboard/internal/concepts/userSSAR/utils';
import EmptyStateFeatureStore from './screens/components/EmptyStateFeatureStore';
import { FeatureStoreObject } from './const';
import InvalidFeatureStoreProject from './screens/components/InvalidFeatureStoreProject';
import { useFeatureStoreCR } from './apiHooks/useFeatureStoreCR';
import { FeatureStoreContextProvider } from './FeatureStoreContext';
import FeatureStoreCRContextProvider from './contexts/FeatureStoreContext';
import { useFeatureStoreObject } from './apiHooks/useFeatureStoreObject';
import useFeatureStoreProjects from './apiHooks/useFeatureStoreProjects';
import { getFeatureStoreObjectDisplayName } from './utils';
import { featureStoreRoute } from './routes';
import { FeatureStoreProject } from './types/featureStoreProjects';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;

type FeatureStoreCoreLoaderProps = {
  getInvalidRedirectPath: (featureStoreObject: FeatureStoreObject) => string;
};

type ApplicationPageRenderState = Pick<
  ApplicationPageProps,
  'emptyStatePage' | 'empty' | 'headerContent'
>;

const FeatureStoreContent: React.FC<{
  getInvalidRedirectPath: (featureStoreObject: FeatureStoreObject) => string;
}> = ({ getInvalidRedirectPath }) => {
  const [isAdmin, isAdminLoaded] = useAccessAllowed(verbModelAccess('create', FeatureStoreModel));
  const {
    data: featureStoreCR,
    loaded: featureStoreCRLoaded,
    error: featureStoreCRError,
  } = useFeatureStoreCR();

  const { fsProjectName } = useParams<{ fsProjectName: string }>();
  const currentFeatureStoreObject = useFeatureStoreObject();
  const { data: featureStoreProjects, loaded: projectsLoaded } = useFeatureStoreProjects();

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

  if (!featureStoreCRLoaded || !isAdminLoaded) {
    return <Bullseye>Loading feature store projects...</Bullseye>;
  }

  if (!featureStoreCR) {
    const adminTitle = 'Create a Feature store service';
    const adminDescription = (
      <>
        No feature store service is available to users in your organization. Create a Feature store
        service from the <b>OpenShift platform</b>.
      </>
    );

    const userTitle = 'Start by requesting a Feature Store project';
    const userDescription =
      'Feature Store projects allow you and your team to organize and collaborate on resources within separate namespaces. To request a project, contact your administrator.';

    const renderStateProps: ApplicationPageRenderState = {
      empty: true,
      emptyStatePage: (
        <EmptyStateFeatureStore
          testid="empty-state-feature-store"
          title={isAdmin ? adminTitle : userTitle}
          description={isAdmin ? adminDescription : userDescription}
          headerIcon={() => <CogIcon />}
          customAction={!isAdmin && <WhosMyAdministrator />}
        />
      ),
      headerContent: null,
    };

    return (
      <ApplicationsPage
        title="Feature Store"
        description="A catalog of features, entities, feature views and datasets created by your own team"
        {...renderStateProps}
        loaded
        provideChildrenPadding
      />
    );
  }

  if (fsProjectName && projectsLoaded) {
    const projectExists = featureStoreProjects.projects.some(
      (project: FeatureStoreProject) => project.spec.name === fsProjectName,
    );

    if (!projectExists) {
      const renderStateProps: ApplicationPageRenderState = {
        empty: true,
        emptyStatePage: (
          <InvalidFeatureStoreProject
            projectName={fsProjectName}
            getRedirectPath={(featureStoreObj, featureStoreProject) =>
              featureStoreProject
                ? featureStoreRoute(featureStoreObj, featureStoreProject)
                : getInvalidRedirectPath(featureStoreObj)
            }
          />
        ),
      };

      return (
        <ApplicationsPage
          title={getFeatureStoreObjectDisplayName(currentFeatureStoreObject)}
          {...renderStateProps}
          loaded
          provideChildrenPadding
        />
      );
    }
  }

  return <Outlet />;
};

const FeatureStoreCoreLoader: React.FC<FeatureStoreCoreLoaderProps> =
  conditionalArea<FeatureStoreCoreLoaderProps>(
    SupportedArea.FEATURE_STORE,
    false,
  )(({ getInvalidRedirectPath }) => {
    return (
      <FeatureStoreCRContextProvider>
        <FeatureStoreContextProvider>
          <FeatureStoreContent getInvalidRedirectPath={getInvalidRedirectPath} />
        </FeatureStoreContextProvider>
      </FeatureStoreCRContextProvider>
    );
  });

export default FeatureStoreCoreLoader;

import React from 'react';
import { Bullseye } from '@patternfly/react-core';
import { CogIcon } from '@patternfly/react-icons';
import { Outlet, useParams } from 'react-router';
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
import { featureStoreRoute } from './FeatureStoreRoutes';
import { FeatureStoreContextProvider } from './FeatureStoreContext';
import { FeatureStoreObject } from './const';
import { useFeatureStoreObject } from './apiHooks/useFeatureStoreObject';
import useFeatureStoreProjects from './apiHooks/useFeatureStoreProjects';
import InvalidFeatureStoreProject from './screens/components/InvalidFeatureStoreProject';
import { getFeatureStoreObjectDisplayName } from './utils';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;

type FeatureStoreCoreLoaderProps = {
  getInvalidRedirectPath: (featureStoreObject: FeatureStoreObject) => string;
};

type ApplicationPageRenderState = Pick<
  ApplicationPageProps,
  'emptyStatePage' | 'empty' | 'headerContent'
>;

// Inner component that uses the projects hook within the context
const FeatureStoreContent: React.FC<{
  getInvalidRedirectPath: (featureStoreObject: FeatureStoreObject) => string;
}> = ({ getInvalidRedirectPath }) => {
  const { fsProjectName } = useParams<{ fsProjectName: string }>();
  const currentFeatureStoreObject = useFeatureStoreObject();
  const { data: featureStoreProjects, loaded: projectsLoaded } = useFeatureStoreProjects();

  // If there's a project name in the URL, validate it
  if (fsProjectName && projectsLoaded) {
    const projectExists = featureStoreProjects.projects.some(
      (project) => project.spec.name === fsProjectName,
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

    // Wait for both feature store CR and admin permissions to load
    if (!featureStoreCRLoaded || !isAdminLoaded) {
      return <Bullseye>Loading feature store projects...</Bullseye>;
    }

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

      const renderStateProps: ApplicationPageRenderState = {
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

    return (
      <FeatureStoreContextProvider>
        <FeatureStoreContent getInvalidRedirectPath={getInvalidRedirectPath} />
      </FeatureStoreContextProvider>
    );
  });

export default FeatureStoreCoreLoader;

import React from 'react';
import { Bullseye } from '@patternfly/react-core';
import { CogIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import { Link, Outlet, useParams } from 'react-router-dom';
import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import { conditionalArea } from '@odh-dashboard/internal/concepts/areas/AreaComponent';
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import WhosMyAdministrator from '@odh-dashboard/internal/components/WhosMyAdministrator';
import RedirectErrorState from '@odh-dashboard/internal/pages/external/RedirectErrorState';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import { verbModelAccess } from '@odh-dashboard/internal/concepts/userSSAR/utils';
import { useClusterInfo } from '@odh-dashboard/internal/redux/selectors/clusterInfo';
import { getOpenShiftConsoleAction } from '@odh-dashboard/internal/app/AppLauncher';
import EmptyStateFeatureStore from './screens/components/EmptyStateFeatureStore';
import { FeatureStoreObject } from './const';
import InvalidFeatureStoreProject from './screens/components/InvalidFeatureStoreProject';
import { useFeatureStoreCR } from './apiHooks/useFeatureStoreCR';
import { FeatureStoreContextProvider } from './FeatureStoreContext';
import FeatureStoreCRContextProvider from './contexts/FeatureStoreContext';
import { useFeatureStoreObject } from './apiHooks/useFeatureStoreObject';
import useFeatureStoreProjects from './apiHooks/useFeatureStoreProjects';
import { getFeatureStoreObjectDescription, getFeatureStoreObjectDisplayName } from './utils';
import { featureStoreRoute } from './routes';
import { FeatureStoreProject } from './types/featureStoreProjects';
import SupportIcon from './icons/header-icons/SupportIcon';

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
  const { serverURL } = useClusterInfo();
  const { data: featureStoreProjects, loaded: projectsLoaded } = useFeatureStoreProjects();
  const osConsoleAction = getOpenShiftConsoleAction(serverURL);

  if (featureStoreCRError) {
    return (
      <ApplicationsPage loaded loadError={featureStoreCRError} empty={false}>
        <RedirectErrorState
          title="Feature Store repository load error"
          errorMessage={featureStoreCRError.message}
        />
      </ApplicationsPage>
    );
  }

  if (!featureStoreCRLoaded || !isAdminLoaded) {
    return <Bullseye>Loading feature store repositories...</Bullseye>;
  }

  if (!featureStoreCR) {
    const adminTitle = 'Create a feature store repository';
    const adminDescription = (
      <>
        No feature store repositories are available to users in your organization. Create a
        repository in OpenShift. <br />
        <br />
        {osConsoleAction && (
          <Link target="_blank" to={osConsoleAction.href || ''} style={{ textDecoration: 'none' }}>
            Go to <b>OpenShift</b> {'   '}
            <ExternalLinkAltIcon />
          </Link>
        )}
      </>
    );

    const userTitle = 'Request access to a feature store repository';
    const userDescription =
      'Feature store repositories allow teams to organize and collaborate on resources within separate namespaces. To request access to a new or existing repository, contact your administrator.';

    const renderStateProps: ApplicationPageRenderState = {
      empty: true,
      emptyStatePage: (
        <EmptyStateFeatureStore
          testid="empty-state-feature-store"
          title={isAdmin ? adminTitle : userTitle}
          description={isAdmin ? adminDescription : userDescription}
          headerIcon={() => (isAdmin ? <CogIcon /> : <SupportIcon />)}
          customAction={!isAdmin && <WhosMyAdministrator />}
        />
      ),
      headerContent: null,
    };

    return (
      <ApplicationsPage
        title={getFeatureStoreObjectDisplayName(currentFeatureStoreObject)}
        description={getFeatureStoreObjectDescription(currentFeatureStoreObject)}
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
          description={getFeatureStoreObjectDescription(currentFeatureStoreObject)}
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

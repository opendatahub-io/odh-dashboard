import React from 'react';
import { Bullseye, Button, Spinner } from '@patternfly/react-core';
import { CogIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import { Link, Outlet, useParams } from 'react-router-dom';
import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import { conditionalArea } from '@odh-dashboard/internal/concepts/areas/AreaComponent';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { ApplicationsPage, WhosMyAdministrator } from '@odh-dashboard/ui-core';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
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
import { useFeatureStoreObject } from './apiHooks/useFeatureStoreObject';
import useFeatureStoreProjects from './apiHooks/useFeatureStoreProjects';
import {
  FeatureStoreObjectToTypeMap,
  getFeatureStoreObjectDescription,
  getFeatureStoreObjectDisplayName,
} from './utils';
import { featureStoreRoute } from './routes';
import { FeatureStoreProject } from './types/featureStoreProjects';
import SupportIcon from './icons/header-icons/SupportIcon';
import FeatureStorePageTitle from './components/FeatureStorePageTitle';
import FeatureStoreObjectIcon from './components/FeatureStoreObjectIcon';

const CreateFeatureStoreLink = (props: React.ComponentProps<'a'>) => (
  <Link {...props} to="/develop-train/feature-store/create" />
);

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
  const isAdminAreaAvailable = useIsAreaAvailable(SupportedArea.FEATURE_STORE_ADMIN).status;
  const showAdminUI = isAdmin && isAdminAreaAvailable;
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
          title="Feature Store load error"
          errorMessage={featureStoreCRError.message}
        />
      </ApplicationsPage>
    );
  }

  if (!featureStoreCRLoaded || !isAdminLoaded) {
    return (
      <Bullseye aria-live="polite" aria-busy>
        <Spinner size="xl" aria-label="Loading feature store" />
      </Bullseye>
    );
  }

  if (!featureStoreCR) {
    let title: string;
    let description: React.ReactNode;
    let icon: () => React.ReactNode;
    let action: React.ReactNode;

    if (showAdminUI) {
      title = 'No feature stores yet';
      description = <>To get started, create a feature store.</>;
      icon = () => <CogIcon />;
      action = (
        <Button
          variant="primary"
          component={CreateFeatureStoreLink}
          data-testid="create-feature-store-btn"
        >
          Create feature store
        </Button>
      );
    } else if (isAdmin) {
      title = 'Create a feature store';
      description = (
        <>
          No feature stores are available to users in your organization. Create a feature store in
          OpenShift. <br />
          <br />
          {osConsoleAction && (
            <Link
              target="_blank"
              rel="noopener noreferrer"
              to={osConsoleAction.href || ''}
              style={{ textDecoration: 'none' }}
            >
              Go to <b>OpenShift Platform</b> {'   '}
              <ExternalLinkAltIcon />
            </Link>
          )}
        </>
      );
      icon = () => <CogIcon />;
      action = undefined;
    } else {
      title = 'Request access to a feature store';
      description = (
        <>
          Feature stores enable teams to organize and collaborate on resources within separate
          namespaces. To request access to a new or existing feature store, contact your
          administrator.
        </>
      );
      icon = () => <SupportIcon />;
      action = <WhosMyAdministrator />;
    }

    const renderStateProps: ApplicationPageRenderState = {
      empty: true,
      emptyStatePage: (
        <EmptyStateFeatureStore
          testid="empty-state-feature-store"
          title={title}
          description={description}
          headerIcon={icon}
          customAction={action}
        />
      ),
      headerContent: null,
    };

    return (
      <ApplicationsPage
        title={
          <FeatureStorePageTitle
            title={
              <FeatureStoreObjectIcon
                objectType={FeatureStoreObjectToTypeMap[currentFeatureStoreObject]}
                title={getFeatureStoreObjectDisplayName(currentFeatureStoreObject)}
                showBackground
                useTypedColors
              />
            }
          />
        }
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
        headerContent: null,
      };

      return (
        <ApplicationsPage
          title={
            <FeatureStorePageTitle
              title={
                <FeatureStoreObjectIcon
                  objectType={FeatureStoreObjectToTypeMap[currentFeatureStoreObject]}
                  title={getFeatureStoreObjectDisplayName(currentFeatureStoreObject)}
                  showBackground
                  useTypedColors
                />
              }
            />
          }
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
      <FeatureStoreContextProvider>
        <FeatureStoreContent getInvalidRedirectPath={getInvalidRedirectPath} />
      </FeatureStoreContextProvider>
    );
  });

export default FeatureStoreCoreLoader;

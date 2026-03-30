import React from 'react';
import { Bullseye, Button } from '@patternfly/react-core';
import { CogIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { Link, Outlet, useParams } from 'react-router-dom';
import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import { conditionalArea } from '@odh-dashboard/internal/concepts/areas/AreaComponent';
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import WhosMyAdministrator from '@odh-dashboard/internal/components/WhosMyAdministrator';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import RedirectErrorState from '@odh-dashboard/internal/pages/external/RedirectErrorState';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import { verbModelAccess } from '@odh-dashboard/internal/concepts/userSSAR/utils';
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
          title="Feature Store load error"
          errorMessage={featureStoreCRError.message}
        />
      </ApplicationsPage>
    );
  }

  if (!featureStoreCRLoaded || !isAdminLoaded) {
    return <Bullseye>Loading feature store...</Bullseye>;
  }

  if (!featureStoreCR) {
    const adminTitle = 'Create a feature store';
    const adminDescription = (
      <>
        No feature stores are available to users in your organization. Create a new feature store to
        get started.
      </>
    );
    const adminAction = (
      <>
        <Button
          variant="primary"
          component={(props: React.ComponentProps<'a'>) => (
            <Link {...props} to="/develop-train/feature-store/create" />
          )}
          icon={<PlusCircleIcon />}
          data-testid="create-feature-store-btn"
        >
          Create feature store
        </Button>
        <Button
          variant="secondary"
          component={(props: React.ComponentProps<'a'>) => (
            <Link {...props} to="/develop-train/feature-store/manage" />
          )}
          data-testid="manage-feature-stores-btn"
        >
          Manage feature stores
        </Button>
      </>
    );

    const userTitle = 'Request access to a feature store';
    const userDescription = (
      <>
        Feature stores enable teams to organize and collaborate on resources within separate
        namespaces. To request access to a new or existing feature store, contact your
        administrator.
      </>
    );

    const renderStateProps: ApplicationPageRenderState = {
      empty: true,
      emptyStatePage: (
        <EmptyStateFeatureStore
          testid="empty-state-feature-store"
          title={isAdmin ? adminTitle : userTitle}
          description={isAdmin ? adminDescription : userDescription}
          headerIcon={() => (isAdmin ? <CogIcon /> : <SupportIcon />)}
          customAction={isAdmin ? adminAction : <WhosMyAdministrator />}
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

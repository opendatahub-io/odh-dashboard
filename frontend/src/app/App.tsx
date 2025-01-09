import React from 'react';
import '@patternfly/patternfly/patternfly.min.css';
import '@patternfly/patternfly/patternfly-addons.css';
import '@patternfly/patternfly/patternfly-charts.css';
import {
  Alert,
  Bullseye,
  Button,
  Page,
  PageSection,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { useSearchParams } from 'react-router-dom';
import ErrorBoundary from '~/components/error/ErrorBoundary';
import ToastNotifications from '~/components/ToastNotifications';
import { useWatchBuildStatus } from '~/utilities/useWatchBuildStatus';
import { useUser } from '~/redux/selectors';
import { DASHBOARD_MAIN_CONTAINER_ID } from '~/utilities/const';
import useDetectUser from '~/utilities/useDetectUser';
import ProjectsContextProvider from '~/concepts/projects/ProjectsContext';
import { ModelRegistrySelectorContextProvider } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import useStorageClasses from '~/concepts/k8s/useStorageClasses';
import AreaContextProvider from '~/concepts/areas/AreaContext';
import { NimContextProvider } from '~/concepts/nimServing/NIMAvailabilityContext';
import { ModelCatalogContextProvider } from '~/concepts/modelCatalog/context/ModelCatalogContext';
import { useBrowserStorage } from '~/components/browserStorage';
import useDevFeatureFlags from './useDevFeatureFlags';
import Header from './Header';
import AppRoutes from './AppRoutes';
import NavSidebar from './NavSidebar';
import AppNotificationDrawer from './AppNotificationDrawer';
import { AppContext } from './AppContext';
import { useApplicationSettings } from './useApplicationSettings';
import TelemetrySetup from './TelemetrySetup';
import { logout } from './appUtils';
import QuickStarts from './QuickStarts';
import DevFeatureFlagsBanner from './DevFeatureFlagsBanner';
import SessionExpiredModal from './SessionExpiredModal';

import './App.scss';

type PocConfigType = {
  altNav?: boolean;
  altPreferredProject?: boolean;
};

const FAVORITE_PROJECTS_KEY = 'odh-favorite-projects';
const POC_SESSION_KEY = 'odh-poc-flags';
const ALT_NAV_PARAM = 'altNav';
const ALT_PROJECTS_PARAM = 'altProjects';

const App: React.FC = () => {
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const { username, userError, isAllowed } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [altNav, setAltNav] = React.useState<boolean>(false);
  const [altPreferredProject, setAltPreferredProject] = React.useState<boolean>(false);
  const firstLoad = React.useRef(true);
  const [pocConfig, setPocConfig] = useBrowserStorage<PocConfigType | null>(
    POC_SESSION_KEY,
    null,
    true,
    true,
  );
  const [favoriteProjects, setFavoriteProjects] = useBrowserStorage<string[]>(
    FAVORITE_PROJECTS_KEY,
    [],
  );

  const buildStatuses = useWatchBuildStatus();
  const {
    dashboardConfig: dashboardConfigFromServer,
    loaded: configLoaded,
    loadError: fetchConfigError,
  } = useApplicationSettings();

  const { dashboardConfig, ...devFeatureFlagsProps } =
    useDevFeatureFlags(dashboardConfigFromServer);

  const [storageClasses] = useStorageClasses();

  useDetectUser();

  React.useEffect(() => {
    if (firstLoad.current && pocConfig?.altNav) {
      setAltNav(true);
    }
    firstLoad.current = false;
  }, [pocConfig]);

  React.useEffect(() => {
    if (searchParams.has(ALT_NAV_PARAM)) {
      const updated = searchParams.get(ALT_NAV_PARAM) === 'true';
      setAltNav(updated);
      setPocConfig({ altNav: updated });

      // clean up query string
      searchParams.delete(ALT_NAV_PARAM);
      setSearchParams(searchParams, { replace: true });
    }
    if (searchParams.has(ALT_PROJECTS_PARAM)) {
      const updated = searchParams.get(ALT_PROJECTS_PARAM) === 'true';
      setAltPreferredProject(updated);
      setPocConfig({ altNav: updated });

      // clean up query string
      searchParams.delete(ALT_NAV_PARAM);
      setSearchParams(searchParams, { replace: true });
    }
    // do not react to changes to setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const contextValue = React.useMemo(
    () =>
      dashboardConfig
        ? {
            buildStatuses,
            dashboardConfig,
            storageClasses,
            isRHOAI: dashboardConfig.metadata?.namespace === 'redhat-ods-applications',
            altNav,
            altPreferredProject,
            favoriteProjects,
            setFavoriteProjects,
          }
        : null,
    [
      dashboardConfig,
      buildStatuses,
      storageClasses,
      altNav,
      altPreferredProject,
      favoriteProjects,
      setFavoriteProjects,
    ],
  );

  const isUnauthorized = fetchConfigError?.request?.status === 403;

  // We lack the critical data to startup the app
  if (userError || fetchConfigError) {
    // Check for unauthorized state
    if (isUnauthorized) {
      return <SessionExpiredModal />;
    }

    // Default error handling for other cases
    return (
      <Page>
        <PageSection hasBodyWrapper={false}>
          <Stack hasGutter>
            <StackItem>
              <Alert variant="danger" isInline title="General loading error">
                <p>
                  {(userError ? userError.message : fetchConfigError?.message) ||
                    'Unknown error occurred during startup.'}
                </p>
                <p>Logging out and logging back in may solve the issue.</p>
              </Alert>
            </StackItem>
            <StackItem>
              <Button
                variant="secondary"
                onClick={() => logout().then(() => window.location.reload())}
              >
                Logout
              </Button>
            </StackItem>
          </Stack>
        </PageSection>
      </Page>
    );
  }

  // Waiting on the API to finish
  const loading = !username || !configLoaded || !dashboardConfig || !contextValue;

  return (
    <AreaContextProvider>
      {loading ? (
        <Bullseye>
          <Spinner />
        </Bullseye>
      ) : (
        <AppContext.Provider value={contextValue}>
          <Page
            className="odh-dashboard"
            isManagedSidebar
            isContentFilled
            masthead={
              <Header onNotificationsClick={() => setNotificationsOpen(!notificationsOpen)} />
            }
            sidebar={isAllowed ? <NavSidebar /> : undefined}
            notificationDrawer={
              <AppNotificationDrawer onClose={() => setNotificationsOpen(false)} />
            }
            isNotificationDrawerExpanded={notificationsOpen}
            mainContainerId={DASHBOARD_MAIN_CONTAINER_ID}
            data-testid={DASHBOARD_MAIN_CONTAINER_ID}
            banner={
              <DevFeatureFlagsBanner
                dashboardConfig={dashboardConfig.spec.dashboardConfig}
                {...devFeatureFlagsProps}
              />
            }
          >
            <ErrorBoundary>
              <NimContextProvider>
                {/* This will be moved to modelCatalog routes as part of RHOAIENG-18959 */}
                <ModelCatalogContextProvider>
                  <ProjectsContextProvider>
                    <ModelRegistrySelectorContextProvider>
                      <QuickStarts>
                        <AppRoutes />
                      </QuickStarts>
                    </ModelRegistrySelectorContextProvider>
                  </ProjectsContextProvider>
                </ModelCatalogContextProvider>
              </NimContextProvider>
              <ToastNotifications />
              <TelemetrySetup />
            </ErrorBoundary>
          </Page>
        </AppContext.Provider>
      )}
    </AreaContextProvider>
  );
};

export default App;

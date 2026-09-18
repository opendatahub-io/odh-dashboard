import React from 'react';
import { PageSection, Tab, TabContent, Tabs, TabTitleText } from '@patternfly/react-core';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ProjectObjectType, TitleWithIcon } from '@odh-dashboard/ui-core';
import ProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/ProjectSelector';
import { useNamespaceSelector, type UseNamespaceSelectorArgs } from 'mod-arch-core';
import ApplicationsPage from '~/app/components/ApplicationsPage';
import ConnectionTypesTab from '~/app/pages/ConnectionTypesTab';
import ConnectionsTab from '~/app/pages/ConnectionsTab';

const PERSISTENCE_OPTIONS = {
  storeLastNamespace: true,
} satisfies UseNamespaceSelectorArgs;

const PROJECT_QUERY_PARAM = 'project';
const TAB_KEYS = ['connection-types', 'connections'] as const;
type TabKey = (typeof TAB_KEYS)[number];

type MainPageProps = {
  basePath: string;
};

const MainPage: React.FC<MainPageProps> = ({ basePath }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    namespaces,
    preferredNamespace,
    updatePreferredNamespace,
    namespacesLoaded,
    namespacesLoadError,
    initializationError,
  } = useNamespaceSelector(PERSISTENCE_OPTIONS);
  const namespaceError = namespacesLoadError ?? initializationError;

  const pathTab = pathname.slice(basePath.length).split('/').filter(Boolean)[0];
  const activeTabKey: TabKey = TAB_KEYS.includes(pathTab as TabKey)
    ? (pathTab as TabKey)
    : 'connection-types';
  const requestedProject = searchParams.get(PROJECT_QUERY_PARAM);
  const projectNamespaces = React.useMemo(
    () =>
      namespaces.map((namespace) => ({
        ...namespace,
        displayName: namespace.displayName ?? namespace.name,
      })),
    [namespaces],
  );
  const validPreferredNamespace = projectNamespaces.find(
    (namespace) => namespace.name === preferredNamespace?.name,
  );
  const selectedProject =
    projectNamespaces.find((namespace) => namespace.name === requestedProject)?.name ??
    validPreferredNamespace?.name ??
    projectNamespaces[0]?.name ??
    '';

  React.useEffect(() => {
    if (pathTab !== activeTabKey) {
      const nextSearch = searchParams.toString();
      navigate(`${basePath}/${activeTabKey}${nextSearch ? `?${nextSearch}` : ''}`, {
        replace: true,
      });
      return;
    }

    if (!selectedProject) {
      return;
    }

    const selectedNamespace = projectNamespaces.find(
      (namespace) => namespace.name === selectedProject,
    );
    if (selectedNamespace && selectedNamespace.name !== preferredNamespace?.name) {
      updatePreferredNamespace(selectedNamespace);
    }

    if (requestedProject !== selectedProject) {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set(PROJECT_QUERY_PARAM, selectedProject);
          return next;
        },
        { replace: true },
      );
    }
  }, [
    activeTabKey,
    basePath,
    navigate,
    projectNamespaces,
    pathTab,
    preferredNamespace,
    requestedProject,
    searchParams,
    selectedProject,
    setSearchParams,
    updatePreferredNamespace,
  ]);

  return (
    <ApplicationsPage
      title={<TitleWithIcon title="Connections" objectType={ProjectObjectType.connections} />}
      loaded={namespacesLoaded}
      loadError={namespaceError}
      errorMessage="Unable to load projects"
      empty={namespacesLoaded && namespaces.length === 0}
      emptyMessage="No projects available"
      headerContent={
        namespacesLoaded && !namespaceError && namespaces.length > 0 ? (
          <ProjectSelector
            namespace={selectedProject}
            onSelection={(projectName) => {
              const namespace = projectNamespaces.find((item) => item.name === projectName);
              if (namespace) {
                updatePreferredNamespace(namespace);
              }
              setSearchParams(
                (previous) => {
                  const next = new URLSearchParams(previous);
                  next.set(PROJECT_QUERY_PARAM, projectName);
                  return next;
                },
                { replace: true },
              );
            }}
            showTitle
            namespacesOverride={projectNamespaces}
          />
        ) : null
      }
    >
      <PageSection type="tabs">
        <Tabs
          activeKey={activeTabKey}
          onSelect={(_event, tabKey) => {
            const nextSearch = searchParams.toString();
            navigate(`${basePath}/${String(tabKey)}${nextSearch ? `?${nextSearch}` : ''}`);
          }}
        >
          <Tab
            eventKey="connection-types"
            title={<TabTitleText>Catalog</TabTitleText>}
            tabContentId="tab-content-connection-types"
            data-testid="tab-connection-types"
          />
          <Tab
            eventKey="connections"
            title={<TabTitleText>Registry</TabTitleText>}
            tabContentId="tab-content-connections"
            data-testid="tab-connections"
          />
        </Tabs>
      </PageSection>
      <TabContent
        id="tab-content-connection-types"
        eventKey="connection-types"
        activeKey={activeTabKey}
        hidden={activeTabKey !== 'connection-types'}
      >
        <ConnectionTypesTab />
      </TabContent>
      <TabContent
        id="tab-content-connections"
        eventKey="connections"
        activeKey={activeTabKey}
        hidden={activeTabKey !== 'connections'}
      >
        <ConnectionsTab />
      </TabContent>
    </ApplicationsPage>
  );
};

export default MainPage;

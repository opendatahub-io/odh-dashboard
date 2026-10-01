import React from 'react';
import { PageSection, Tab, TabContent, Tabs, TabTitleText } from '@patternfly/react-core';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
type TabKey = 'connection-types' | 'connections';

type MainPageProps = {
  activeTabKey: TabKey;
};

const MainPage: React.FC<MainPageProps> = ({ activeTabKey }) => {
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
    projectNamespaces,
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
            navigate(`../${String(tabKey)}${nextSearch ? `?${nextSearch}` : ''}`, {
              relative: 'path',
            });
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
        <ConnectionTypesTab namespace={selectedProject} />
      </TabContent>
      <TabContent
        id="tab-content-connections"
        eventKey="connections"
        activeKey={activeTabKey}
        hidden={activeTabKey !== 'connections'}
      >
        <ConnectionsTab
          key={selectedProject}
          namespace={selectedProject}
          isActive={activeTabKey === 'connections'}
        />
      </TabContent>
    </ApplicationsPage>
  );
};

export default MainPage;

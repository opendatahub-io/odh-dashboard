import React from 'react';
import {
  PageSection,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  EmptyStateActions,
  Button,
  Spinner,
  Flex,
  FlexItem,
  Content,
  Alert,
} from '@patternfly/react-core';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useNamespaceSelector, type UseNamespaceSelectorArgs } from 'mod-arch-core';
import ProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/ProjectSelector';
import { useNamespaces } from '~/app/hooks/useNamespaces';
import NewProjectButton from '~/app/components/NewProjectButton';
import './DataRegistryPage.scss';
import { useCollections } from '~/app/hooks/useCollections';
import { useAssets } from '~/app/hooks/useAssets';
import { useConnections } from '~/app/hooks/useConnections';
import { useLabels } from '~/app/hooks/useLabels';
import { is503Error, is403Error, isConnectionError } from '~/app/api/dataRegistry';
import { hasDataRegistryWriteAccess } from '~/app/utilities/access';
import RegistryTable from '~/app/components/RegistryTable';
import ManageCollectionsModal from '~/app/components/ManageCollectionsModal';
import ManageLabelsModal from '~/app/components/ManageLabelsModal';
import RegisterDataModal from '~/app/components/RegisterDataModal';
import ServiceUnavailableError from '~/app/components/errors/ServiceUnavailableError';
import AccessDeniedError from '~/app/components/errors/AccessDeniedError';
import ConnectionError from '~/app/components/errors/ConnectionError';
import { shouldDisplayConnectionWarning } from '~/app/utilities/connectionUtils';
import noProjectsImage from '~/images/RHOAI-Registerdata-Noprojects-RGB.png';

// TODO: Replace with isAvailableProject from @odh-dashboard/k8s-core when BFF returns filtered projects
const HIDDEN_NS_PREFIXES = ['openshift-', 'kube-'];
const HIDDEN_NS = ['openshift', 'default', 'system', 'redhat-ods-applications'];
const PERSISTENCE_OPTIONS = {
  storeLastNamespace: true,
} satisfies UseNamespaceSelectorArgs;

type NoProjectsPageProps = {
  onProjectCreated: (projectName: string) => void | Promise<void>;
};

type ProjectCreationErrorPageProps = {
  projectName: string;
  error?: Error;
  onRetry: () => void;
};

const NoProjectsPage: React.FC<NoProjectsPageProps> = ({ onProjectCreated }) => (
  <PageSection hasBodyWrapper={false} isFilled>
    <EmptyState
      headingLevel="h2"
      icon={() => (
        <img
          className="odh-data-registry__empty-state-image"
          src={noProjectsImage}
          alt="No projects"
        />
      )}
      titleText="No projects"
      variant={EmptyStateVariant.lg}
      data-testid="no-projects-empty-state"
    >
      <EmptyStateBody>To browse data assets, first create a project.</EmptyStateBody>
      <EmptyStateFooter>
        <NewProjectButton onProjectCreated={onProjectCreated} />
      </EmptyStateFooter>
    </EmptyState>
  </PageSection>
);

const ProjectCreationErrorPage: React.FC<ProjectCreationErrorPageProps> = ({
  projectName,
  error,
  onRetry,
}) => (
  <PageSection hasBodyWrapper={false} isFilled>
    <EmptyState
      headingLevel="h2"
      titleText="Project is not available yet"
      variant={EmptyStateVariant.lg}
    >
      <EmptyStateBody>
        {error?.message ||
          `Project "${projectName}" was created, but it is not available in the project list yet.`}
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Button variant="primary" onClick={onRetry} data-testid="retry-project-creation">
            Retry
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  </PageSection>
);

const DataRegistryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedProject = searchParams.get('project') || '';
  const [isCollectionsModalOpen, setIsCollectionsModalOpen] = React.useState(false);
  const [isLabelsModalOpen, setIsLabelsModalOpen] = React.useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = React.useState(false);
  const [returnToRegisterData, setReturnToRegisterData] = React.useState(false);
  const returnToEditRef = React.useRef<(() => void) | undefined>(undefined);
  const [projectCreationFailure, setProjectCreationFailure] = React.useState<string>();

  const { preferredNamespace, updatePreferredNamespace } =
    useNamespaceSelector(PERSISTENCE_OPTIONS);
  const [namespaces, namespacesLoaded, namespacesError, namespacesRefresh] = useNamespaces();

  const projects = React.useMemo(
    () =>
      namespaces.filter(
        (ns) =>
          !HIDDEN_NS_PREFIXES.some((prefix) => ns.name.startsWith(prefix)) &&
          !HIDDEN_NS.includes(ns.name),
      ),
    [namespaces],
  );

  const projectNamespaces = React.useMemo(
    () =>
      projects.map((project) => ({
        ...project,
        displayName: project.displayName ?? project.name,
      })),
    [projects],
  );
  const validPreferredNamespace = projectNamespaces.find(
    (project) => project.name === preferredNamespace?.name,
  );
  const requestedNamespace = projectNamespaces.find((project) => project.name === requestedProject);
  let selectedProject = '';
  if (requestedNamespace) {
    selectedProject = requestedNamespace.name;
  } else if (validPreferredNamespace) {
    selectedProject = validPreferredNamespace.name;
  } else if (projectNamespaces.length > 0) {
    selectedProject = projectNamespaces[0].name;
  }

  React.useEffect(() => {
    if (!selectedProject) {
      return;
    }

    const selectedNamespace = projectNamespaces.find((project) => project.name === selectedProject);
    if (selectedNamespace && selectedNamespace.name !== preferredNamespace?.name) {
      updatePreferredNamespace(selectedNamespace);
    }

    if (requestedProject !== selectedProject) {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set('project', selectedProject);
          return next;
        },
        { replace: true },
      );
    }
  }, [
    preferredNamespace,
    projectNamespaces,
    requestedProject,
    selectedProject,
    setSearchParams,
    updatePreferredNamespace,
  ]);

  const [assets, assetsLoaded, assetsError, assetsRefresh, collectionNames] =
    useAssets(selectedProject);
  const [
    connections,
    connectionsLoaded,
    connectionsError,
    ,
    connectionWarnings,
    fetchedConnectionDisplayData,
  ] = useConnections(selectedProject);
  const connectionDisplayData = fetchedConnectionDisplayData ?? connections;
  const hasExistingDchConnectionReferences =
    assetsLoaded && assets.some((asset) => asset.rawAsset?.connection_ref?.type === 'dch');
  const hasExistingRhaiConnectionReferences =
    assetsLoaded && assets.some((asset) => asset.rawAsset?.connection_ref?.type === 'secret');
  const visibleConnectionWarnings = connectionWarnings.filter((warning) =>
    shouldDisplayConnectionWarning(
      warning,
      hasExistingDchConnectionReferences,
      hasExistingRhaiConnectionReferences,
    ),
  );
  const [, collectionsLoaded, collectionsError, collectionsRefresh] = useCollections(
    selectedProject,
    assets,
    collectionNames,
  );
  const [labels, , , labelsRefresh] = useLabels(selectedProject);

  const hasWriteAccess = hasDataRegistryWriteAccess(assetsError, collectionsError);

  const handleRefresh = React.useCallback(async () => {
    await Promise.all([assetsRefresh(), collectionsRefresh(), labelsRefresh()]);
  }, [assetsRefresh, collectionsRefresh, labelsRefresh]);

  const handleCollectionsModalClose = React.useCallback(async () => {
    setIsCollectionsModalOpen(false);
    if (returnToRegisterData) {
      await assetsRefresh();
      setReturnToRegisterData(false);
      setIsRegisterModalOpen(true);
      return;
    }
    const returnToEdit = returnToEditRef.current;
    returnToEditRef.current = undefined;
    returnToEdit?.();
  }, [assetsRefresh, returnToRegisterData]);

  const handleLabelsModalClose = React.useCallback(() => {
    setIsLabelsModalOpen(false);
    if (returnToRegisterData) {
      setReturnToRegisterData(false);
      setIsRegisterModalOpen(true);
      return;
    }
    const returnToEdit = returnToEditRef.current;
    returnToEditRef.current = undefined;
    returnToEdit?.();
  }, [returnToRegisterData]);

  const handleProjectSelect = React.useCallback(
    (projectName: string) => {
      returnToEditRef.current = undefined;
      const namespace = projectNamespaces.find((project) => project.name === projectName);
      if (namespace) {
        updatePreferredNamespace(namespace);
      }
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set('project', projectName);
          return next;
        },
        { replace: true },
      );
    },
    [projectNamespaces, setSearchParams, updatePreferredNamespace],
  );

  const handleProjectCreated = React.useCallback(
    async (projectName: string) => {
      const refreshedNamespaces = await namespacesRefresh();
      if (!refreshedNamespaces?.some((namespace) => namespace.name === projectName)) {
        setProjectCreationFailure(projectName);
        return;
      }

      setProjectCreationFailure(undefined);
      navigate(`/ai-hub/data/browse?project=${encodeURIComponent(projectName)}`);
    },
    [namespacesRefresh, navigate],
  );

  const handleProjectCreationRetry = React.useCallback(() => {
    if (projectCreationFailure) {
      void handleProjectCreated(projectCreationFailure);
    }
  }, [handleProjectCreated, projectCreationFailure]);

  if (projectCreationFailure) {
    return (
      <ProjectCreationErrorPage
        projectName={projectCreationFailure}
        error={namespacesError}
        onRetry={handleProjectCreationRetry}
      />
    );
  }

  if (namespacesError) {
    if (is503Error(namespacesError)) {
      return (
        <PageSection hasBodyWrapper={false} isFilled>
          <ServiceUnavailableError onRetry={namespacesRefresh} />
        </PageSection>
      );
    }
    if (is403Error(namespacesError)) {
      return (
        <PageSection hasBodyWrapper={false} isFilled>
          <AccessDeniedError />
        </PageSection>
      );
    }
    if (isConnectionError(namespacesError)) {
      return (
        <PageSection hasBodyWrapper={false} isFilled>
          <ConnectionError onRetry={namespacesRefresh} />
        </PageSection>
      );
    }
    return (
      <PageSection hasBodyWrapper={false} isFilled>
        <EmptyState
          headingLevel="h2"
          titleText="Error loading projects"
          variant={EmptyStateVariant.lg}
        >
          <EmptyStateBody>{namespacesError.message}</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  if (!namespacesLoaded) {
    return (
      <PageSection hasBodyWrapper={false} isFilled>
        <EmptyState headingLevel="h2" titleText="Loading" variant={EmptyStateVariant.lg}>
          <Spinner size="xl" />
        </EmptyState>
      </PageSection>
    );
  }

  if (projects.length === 0) {
    return <NoProjectsPage onProjectCreated={handleProjectCreated} />;
  }

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        <Content component="p" className="pf-v6-u-mb-xs">
          View and manage this project’s data assets where information is located.
        </Content>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
          <FlexItem>
            <ProjectSelector
              namespace={selectedProject}
              onSelection={handleProjectSelect}
              namespacesOverride={projectNamespaces}
              showTitle
            />
          </FlexItem>
        </Flex>
      </PageSection>

      {!selectedProject ? (
        <PageSection hasBodyWrapper={false} isFilled>
          <EmptyState headingLevel="h2" titleText="Select a project" variant={EmptyStateVariant.lg}>
            <EmptyStateBody>
              Choose a project from the dropdown above to browse data assets.
            </EmptyStateBody>
          </EmptyState>
        </PageSection>
      ) : (
        <>
          {connectionsError ? (
            <PageSection hasBodyWrapper={false}>
              <Alert
                variant="warning"
                isInline
                title="Unable to load connections"
                data-testid="connections-error"
              >
                {connectionsError.message}
              </Alert>
            </PageSection>
          ) : null}
          {visibleConnectionWarnings.length > 0 ? (
            <PageSection hasBodyWrapper={false}>
              {visibleConnectionWarnings.map((warning) => (
                <Alert key={warning.code} variant="warning" isInline title={warning.message} />
              ))}
            </PageSection>
          ) : null}
          <RegistryTable
            assets={assets}
            loaded={assetsLoaded && collectionsLoaded}
            error={assetsError ?? collectionsError}
            labels={labels}
            connections={connections}
            connectionDisplayData={connectionDisplayData}
            connectionsLoaded={connectionsLoaded}
            connectionsError={connectionsError}
            project={selectedProject}
            onManageCollections={(onReturnToEdit) => {
              setReturnToRegisterData(false);
              if (!collectionsError) {
                returnToEditRef.current = onReturnToEdit;
                setIsCollectionsModalOpen(true);
              } else {
                onReturnToEdit?.();
              }
            }}
            onManageLabels={(onReturnToEdit) => {
              returnToEditRef.current = onReturnToEdit;
              setReturnToRegisterData(false);
              setIsLabelsModalOpen(true);
            }}
            onRegisterData={() => {
              setReturnToRegisterData(false);
              setIsRegisterModalOpen(true);
            }}
            onRetry={handleRefresh}
            hasWriteAccess={hasWriteAccess}
          />
          <ManageCollectionsModal
            isOpen={isCollectionsModalOpen}
            onClose={handleCollectionsModalClose}
            project={selectedProject}
            onRefresh={handleRefresh}
          />
          <ManageLabelsModal
            isOpen={isLabelsModalOpen}
            onClose={handleLabelsModalClose}
            project={selectedProject}
            labels={labels}
            assets={assets}
            onRefresh={handleRefresh}
          />
          <RegisterDataModal
            key={selectedProject}
            isOpen={isRegisterModalOpen}
            onClose={() => setIsRegisterModalOpen(false)}
            project={selectedProject}
            collections={collectionNames}
            hasExistingDchConnectionReferences={hasExistingDchConnectionReferences}
            hasExistingRhaiConnectionReferences={hasExistingRhaiConnectionReferences}
            onCreated={handleRefresh}
            onManageCollections={() => {
              setIsRegisterModalOpen(false);
              setReturnToRegisterData(true);
              setIsCollectionsModalOpen(true);
            }}
            onManageLabels={() => {
              setIsRegisterModalOpen(false);
              setReturnToRegisterData(true);
              setIsLabelsModalOpen(true);
            }}
          />
        </>
      )}
    </>
  );
};

export default DataRegistryPage;

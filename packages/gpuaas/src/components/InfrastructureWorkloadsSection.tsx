import * as React from 'react';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import ProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/ProjectSelector';
import { relativeTime } from '@odh-dashboard/internal/utilities/time';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import useProjectNotebookStates from '@odh-dashboard/internal/pages/projects/notebook/useProjectNotebookStates';
import {
  Alert,
  Bullseye,
  Button,
  Content,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Spinner,
  Stack,
  StackItem,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import { PlusCircleIcon, SyncAltIcon } from '@patternfly/react-icons';
import InfrastructureWorkloadsTable from './InfrastructureWorkloadsTable';
import WorkloadOverview from './WorkloadOverview';
import useInfrastructureWorkloads from '../hooks/useInfrastructureWorkloads';
import useWorkloadStatusFilters from '../hooks/useWorkloadStatusFilters';
import { isKueueManagedDataScienceProject } from '../utils/kueueProjects';
import {
  INFRASTRUCTURE_WORKLOADS_EMPTY_BODY,
  INFRASTRUCTURE_WORKLOADS_EMPTY_TITLE,
} from '../const';
import './InfrastructureWorkloadsSection.scss';

const WORKLOADS_PAGE_DESCRIPTION = 'Monitor the metrics of your active resources.';

type InfrastructureWorkloadsHeaderProps = {
  preferredProject: React.ContextType<typeof ProjectsContext>['preferredProject'];
  refreshTime: string;
  onProjectSelection: (projectName: string) => void;
  onRefresh: () => void;
};

const InfrastructureWorkloadsHeader: React.FC<InfrastructureWorkloadsHeaderProps> = ({
  preferredProject,
  refreshTime,
  onProjectSelection,
  onRefresh,
}) => (
  <Stack
    hasGutter
    className="gpuaas-infrastructure-workloads__header-section"
    data-testid="infrastructure-workloads-header-section"
  >
    <StackItem>
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        flexWrap={{ default: 'wrap' }}
        gap={{ default: 'gapMd' }}
        data-testid="infrastructure-workloads-header"
      >
        <FlexItem>
          <Title headingLevel="h2" data-testid="infrastructure-workloads-title">
            Workloads
          </Title>
        </FlexItem>
        <FlexItem>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsSm' }}
            data-testid="infrastructure-workloads-refresh"
          >
            <FlexItem>
              <Tooltip content="Refresh">
                <Button variant="plain" aria-label="Refresh" onClick={onRefresh}>
                  <SyncAltIcon />
                </Button>
              </Tooltip>
            </FlexItem>
            <FlexItem>
              <Content component="small" className="pf-v6-u-color-subtle">
                Updated {refreshTime === 'Just now' ? 'just now' : refreshTime}
              </Content>
            </FlexItem>
          </Flex>
        </FlexItem>
      </Flex>
      <Content component="p" data-testid="infrastructure-workloads-description">
        {WORKLOADS_PAGE_DESCRIPTION}
      </Content>
    </StackItem>
    <StackItem>
      <ProjectSelector
        namespace={preferredProject?.metadata.name ?? ''}
        onSelection={onProjectSelection}
        showTitle
      />
    </StackItem>
  </Stack>
);

const InfrastructureWorkloadsEmptyState: React.FC = () => (
  <Bullseye data-testid="infrastructure-workloads-empty">
    <EmptyState
      headingLevel="h2"
      icon={PlusCircleIcon}
      titleText={INFRASTRUCTURE_WORKLOADS_EMPTY_TITLE}
      variant={EmptyStateVariant.lg}
    >
      <EmptyStateBody>{INFRASTRUCTURE_WORKLOADS_EMPTY_BODY}</EmptyStateBody>
    </EmptyState>
  </Bullseye>
);

type InfrastructureWorkloadsContentProps = {
  loaded: boolean;
  error?: Error;
  workloads: React.ComponentProps<typeof InfrastructureWorkloadsTable>['workloads'];
  kueueAvailable: boolean;
  canAccessAdminMetrics: boolean;
  namespace?: string;
  refreshTrigger: number;
  kueueEnabled: boolean;
  hardwareProfilesLoading: boolean;
  notebookStates: React.ComponentProps<typeof InfrastructureWorkloadsTable>['notebookStates'];
  failedSources: string[];
};

const InfrastructureWorkloadsContent: React.FC<InfrastructureWorkloadsContentProps> = ({
  loaded,
  error,
  workloads,
  kueueAvailable,
  canAccessAdminMetrics,
  namespace,
  refreshTrigger,
  kueueEnabled,
  hardwareProfilesLoading,
  notebookStates,
  failedSources,
}) => {
  const workloadsTableRef = React.useRef<HTMLDivElement>(null);
  const scrollToWorkloadsTable = React.useCallback(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        workloadsTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }, []);
  const workloadStatusFilters = useWorkloadStatusFilters(
    workloads,
    notebookStates,
    scrollToWorkloadsTable,
  );
  const { setOverviewStatusFilters } = workloadStatusFilters;
  React.useEffect(() => {
    setOverviewStatusFilters([]);
  }, [namespace, setOverviewStatusFilters]);
  const hasBlockingWorkloadFailure = failedSources.length > 0 && workloads.length === 0;
  if (!loaded) {
    return (
      <Bullseye style={{ minHeight: '50vh' }} data-testid="infrastructure-workloads-loading">
        <Spinner />
      </Bullseye>
    );
  }

  if (error) {
    return (
      <Alert
        isInline
        variant="danger"
        title={error.message}
        data-testid="infrastructure-workloads-error"
      />
    );
  }

  if (hasBlockingWorkloadFailure) {
    return (
      <Alert
        isInline
        variant="danger"
        title="Unable to load workloads"
        data-testid="infrastructure-workloads-error"
      >
        Workload data could not be loaded. Refresh to try again.
      </Alert>
    );
  }

  if (failedSources.length > 0) {
    return (
      <Stack hasGutter>
        <StackItem>
          <WorkloadOverview
            workloads={workloadStatusFilters.overviewRows}
            loaded
            kueueAvailable={kueueAvailable}
            canAccessAdminMetrics={canAccessAdminMetrics}
            namespace={namespace}
            refreshTrigger={refreshTrigger}
            partial
            onViewInTable={workloadStatusFilters.viewBucketInTable}
          />
        </StackItem>
        {workloads.length > 0 && (
          <StackItem>
            <div ref={workloadsTableRef} data-testid="infrastructure-workloads-table-section">
              <InfrastructureWorkloadsTable
                key={namespace}
                workloads={workloadStatusFilters.workloads}
                kueueEnabled={kueueEnabled}
                hardwareProfilesLoading={hardwareProfilesLoading}
                notebookStates={notebookStates}
                failedSources={failedSources}
                overviewStatusFilters={workloadStatusFilters.overviewStatusFilters}
                onOverviewStatusFiltersChange={workloadStatusFilters.setOverviewStatusFilters}
              />
            </div>
          </StackItem>
        )}
      </Stack>
    );
  }

  if (workloads.length === 0) {
    return <InfrastructureWorkloadsEmptyState />;
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <WorkloadOverview
          workloads={workloadStatusFilters.overviewRows}
          loaded
          kueueAvailable={kueueAvailable}
          canAccessAdminMetrics={canAccessAdminMetrics}
          namespace={namespace}
          refreshTrigger={refreshTrigger}
          onViewInTable={workloadStatusFilters.viewBucketInTable}
        />
      </StackItem>
      <StackItem>
        <div ref={workloadsTableRef} data-testid="infrastructure-workloads-table-section">
          <InfrastructureWorkloadsTable
            key={namespace}
            workloads={workloadStatusFilters.workloads}
            kueueEnabled={kueueEnabled}
            hardwareProfilesLoading={hardwareProfilesLoading}
            notebookStates={notebookStates}
            failedSources={failedSources}
            overviewStatusFilters={workloadStatusFilters.overviewStatusFilters}
            onOverviewStatusFiltersChange={workloadStatusFilters.setOverviewStatusFilters}
          />
        </div>
      </StackItem>
    </Stack>
  );
};

type InfrastructureWorkloadsSectionProps = {
  kueueAvailable: boolean;
  canAccessAdminMetrics: boolean;
};

const InfrastructureWorkloadsSection: React.FC<InfrastructureWorkloadsSectionProps> = ({
  kueueAvailable,
  canAccessAdminMetrics,
}) => {
  const {
    projects,
    preferredProject,
    updatePreferredProject,
    loaded: projectsLoaded,
  } = React.useContext(ProjectsContext);
  const notebooks = useProjectNotebookStates(preferredProject?.metadata.name);
  const { refresh: refreshNotebooks } = notebooks;
  const {
    workloads,
    kueueEnabled,
    loaded,
    hardwareProfilesLoading,
    error,
    refresh,
    failedSources,
  } = useInfrastructureWorkloads(preferredProject?.metadata.name, preferredProject);
  const [lastRefreshed, setLastRefreshed] = React.useState(() => new Date());
  const [currentTime, setCurrentTime] = React.useState(() => Date.now());
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  React.useEffect(() => {
    if (projectsLoaded && !preferredProject && projects.length > 0) {
      updatePreferredProject(projects[0]);
    }
  }, [preferredProject, projects, projectsLoaded, updatePreferredProject]);

  React.useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 20_000);
    return () => window.clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (loaded) {
      setLastRefreshed(new Date());
    }
  }, [loaded, workloads]);

  React.useEffect(() => {
    if (refreshTrigger > 0) {
      void refresh();
    }
  }, [refresh, refreshTrigger]);

  const handleRefresh = React.useCallback(() => {
    setRefreshTrigger((current) => current + 1);
    void refreshNotebooks();
  }, [refreshNotebooks]);

  const handleProjectSelection = React.useCallback(
    (projectName: string) => {
      updatePreferredProject(
        projects.find((project) => project.metadata.name === projectName) ?? null,
      );
    },
    [projects, updatePreferredProject],
  );

  const refreshTime = relativeTime(currentTime, lastRefreshed.getTime());
  const admissionsAvailable =
    kueueAvailable &&
    preferredProject !== null &&
    isKueueManagedDataScienceProject(preferredProject);

  return (
    <Stack hasGutter>
      <InfrastructureWorkloadsHeader
        preferredProject={preferredProject}
        refreshTime={refreshTime}
        onProjectSelection={handleProjectSelection}
        onRefresh={handleRefresh}
      />
      <div data-testid="infrastructure-workloads">
        <Stack>
          <StackItem>
            <InfrastructureWorkloadsContent
              loaded={loaded}
              error={error}
              workloads={workloads}
              kueueAvailable={admissionsAvailable}
              canAccessAdminMetrics={canAccessAdminMetrics}
              namespace={preferredProject?.metadata.name}
              refreshTrigger={refreshTrigger}
              kueueEnabled={kueueEnabled}
              hardwareProfilesLoading={hardwareProfilesLoading}
              notebookStates={notebooks.data}
              failedSources={failedSources}
            />
          </StackItem>
        </Stack>
      </div>
    </Stack>
  );
};

export default InfrastructureWorkloadsSection;

import * as React from 'react';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { useWorkingProject } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import ProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/ProjectSelector';
import { useTrackEvent } from '@odh-dashboard/analytics/react';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
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
import { GPUAAS_EVENTS, WORKLOADS_INTERACTION_TYPES } from '../tracking/gpuaasTrackingConstants';
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
  showProjectSelector: boolean;
};

const InfrastructureWorkloadsHeader: React.FC<InfrastructureWorkloadsHeaderProps> = ({
  preferredProject,
  refreshTime,
  onProjectSelection,
  onRefresh,
  showProjectSelector,
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
    {showProjectSelector && (
      <StackItem>
        <ProjectSelector
          namespace={preferredProject?.metadata.name ?? ''}
          onSelection={onProjectSelection}
          showTitle
        />
      </StackItem>
    )}
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
  const trackEvent = useTrackEvent();
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
            onStatusOverviewSegmentClick={(statusClicked) =>
              trackEvent(GPUAAS_EVENTS.WORKLOADS_TAB_STATUS_OVERVIEW_SEGMENT_CLICKED, {
                statusClicked,
              })
            }
            onPopoverClosed={(statusClicked, closeMethod) =>
              trackEvent(GPUAAS_EVENTS.WORKLOADS_TAB_STATUS_OVERVIEW_POPOVER_CLOSED, {
                statusClicked,
                closeMethod,
              })
            }
            onViewInTableClicked={(overviewSegment) =>
              trackEvent(GPUAAS_EVENTS.WORKLOADS_TAB_STATUS_OVERVIEW_VIEW_IN_TABLE_CLICKED, {
                overviewSegment,
              })
            }
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
          onStatusOverviewSegmentClick={(statusClicked) =>
            trackEvent(GPUAAS_EVENTS.WORKLOADS_TAB_STATUS_OVERVIEW_SEGMENT_CLICKED, {
              statusClicked,
            })
          }
          onPopoverClosed={(statusClicked, closeMethod) =>
            trackEvent(GPUAAS_EVENTS.WORKLOADS_TAB_STATUS_OVERVIEW_POPOVER_CLOSED, {
              statusClicked,
              closeMethod,
            })
          }
          onViewInTableClicked={(overviewSegment) =>
            trackEvent(GPUAAS_EVENTS.WORKLOADS_TAB_STATUS_OVERVIEW_VIEW_IN_TABLE_CLICKED, {
              overviewSegment,
            })
          }
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
  const trackEvent = useTrackEvent();
  const isUnifiedProjectSelectorEnabled = useIsAreaAvailable(
    SupportedArea.UNIFIED_PROJECT_SELECTOR,
  ).status;
  const {
    projects,
    preferredProject,
    updatePreferredProject,
    loaded: projectsLoaded,
  } = React.useContext(ProjectsContext);
  const { activeProject } = useWorkingProject();
  const selectedProject = isUnifiedProjectSelectorEnabled
    ? projects.find((project) => project.metadata.name === activeProject?.name) ?? null
    : preferredProject;
  const notebooks = useProjectNotebookStates(selectedProject?.metadata.name);
  const { refresh: refreshNotebooks } = notebooks;
  const {
    workloads,
    kueueEnabled,
    loaded,
    hardwareProfilesLoading,
    error,
    refresh,
    failedSources,
  } = useInfrastructureWorkloads(selectedProject?.metadata.name, selectedProject);
  const tabLoadedAt = React.useRef(Date.now());
  const [lastRefreshed, setLastRefreshed] = React.useState(() => new Date());
  const [currentTime, setCurrentTime] = React.useState(() => Date.now());
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  React.useEffect(() => {
    if (
      !isUnifiedProjectSelectorEnabled &&
      projectsLoaded &&
      !selectedProject &&
      projects.length > 0
    ) {
      updatePreferredProject(projects[0]);
    }
  }, [
    isUnifiedProjectSelectorEnabled,
    selectedProject,
    projects,
    projectsLoaded,
    updatePreferredProject,
  ]);

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
    const now = Date.now();
    const secondsSinceLastUpdate = Math.round((now - lastRefreshed.getTime()) / 1000);
    const secondsSinceTabLoad = Math.round((now - tabLoadedAt.current) / 1000);
    setRefreshTrigger((current) => current + 1);
    void refreshNotebooks();
    trackEvent(GPUAAS_EVENTS.DATA_REFRESHED, {
      refreshSource: 'workloads',
      outcome: 'click',
      secondsSinceLastUpdate,
    });
    trackEvent(GPUAAS_EVENTS.WORKLOADS_TAB_INTERACTED, {
      interactionType: WORKLOADS_INTERACTION_TYPES.refresh,
      secondsSinceTabLoad,
    });
  }, [lastRefreshed, refreshNotebooks, trackEvent]);

  const handleProjectSelection = React.useCallback(
    (projectName: string) => {
      trackEvent(GPUAAS_EVENTS.WORKLOADS_TAB_PROJECT_FILTER_SELECTED, { projectName });
      updatePreferredProject(
        projects.find((project) => project.metadata.name === projectName) ?? null,
      );
    },
    [projects, updatePreferredProject, trackEvent],
  );

  const refreshTime = relativeTime(currentTime, lastRefreshed.getTime());
  const admissionsAvailable =
    kueueAvailable && selectedProject !== null && isKueueManagedDataScienceProject(selectedProject);

  return (
    <Stack hasGutter>
      <InfrastructureWorkloadsHeader
        preferredProject={selectedProject}
        refreshTime={refreshTime}
        onProjectSelection={handleProjectSelection}
        onRefresh={handleRefresh}
        showProjectSelector={!isUnifiedProjectSelectorEnabled}
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
              namespace={selectedProject?.metadata.name}
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

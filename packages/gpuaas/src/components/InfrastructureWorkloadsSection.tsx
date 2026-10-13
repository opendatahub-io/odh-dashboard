import * as React from 'react';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import ProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/ProjectSelector';
import { relativeTime } from '@odh-dashboard/internal/utilities/time';
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
  kueueEnabled: boolean;
  hardwareProfilesLoading: boolean;
  notebookStates: React.ComponentProps<typeof InfrastructureWorkloadsTable>['notebookStates'];
  failedSources: string[];
};

const InfrastructureWorkloadsContent: React.FC<InfrastructureWorkloadsContentProps> = ({
  loaded,
  error,
  workloads,
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

  if (failedSources.length > 0) {
    return (
      <Stack hasGutter>
        <StackItem>
          <WorkloadOverview
            workloads={workloadStatusFilters.overviewRows}
            loaded
            partial
            onViewInTable={workloadStatusFilters.viewBucketInTable}
          />
        </StackItem>
        {workloads.length > 0 && (
          <StackItem>
            <div ref={workloadsTableRef} data-testid="infrastructure-workloads-table-section">
              <InfrastructureWorkloadsTable
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
          onViewInTable={workloadStatusFilters.viewBucketInTable}
        />
      </StackItem>
      <StackItem>
        <div ref={workloadsTableRef} data-testid="infrastructure-workloads-table-section">
          <InfrastructureWorkloadsTable
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

const InfrastructureWorkloadsSection: React.FC = () => {
  const workloadsContentRef = React.useRef<HTMLDivElement>(null);
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

  const previousProjectName = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    const projectName = preferredProject?.metadata.name;
    if (previousProjectName.current && projectName !== previousProjectName.current) {
      window.requestAnimationFrame(() => {
        const contentSection = workloadsContentRef.current;
        if (contentSection) {
          contentSection.scrollTop = 0;
        }
      });
    }
    previousProjectName.current = projectName;
  }, [preferredProject?.metadata.name]);

  React.useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 20_000);
    return () => window.clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (refreshTrigger > 0) {
      void refresh();
    }
  }, [refresh, refreshTrigger]);

  const handleRefresh = React.useCallback(() => {
    setLastRefreshed(new Date());
    setRefreshTrigger((current) => current + 1);
    void refreshNotebooks();
  }, [refreshNotebooks]);

  const handleProjectSelection = React.useCallback(
    (projectName: string) => {
      updatePreferredProject(
        projects.find((project) => project.metadata.name === projectName) ?? null,
      );
      setLastRefreshed(new Date());
    },
    [projects, updatePreferredProject],
  );

  const refreshTime = relativeTime(currentTime, lastRefreshed.getTime());

  return (
    <Stack className="gpuaas-infrastructure-workloads" hasGutter>
      <InfrastructureWorkloadsHeader
        preferredProject={preferredProject}
        refreshTime={refreshTime}
        onProjectSelection={handleProjectSelection}
        onRefresh={handleRefresh}
      />
      <Stack
        ref={workloadsContentRef}
        className="gpuaas-infrastructure-workloads__content-section"
        data-testid="infrastructure-workloads"
      >
        <StackItem>
          <InfrastructureWorkloadsContent
            loaded={loaded}
            error={error}
            workloads={workloads}
            kueueEnabled={kueueEnabled}
            hardwareProfilesLoading={hardwareProfilesLoading}
            notebookStates={notebooks.data}
            failedSources={failedSources}
          />
        </StackItem>
      </Stack>
    </Stack>
  );
};

export default InfrastructureWorkloadsSection;

import * as React from 'react';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { CubesIcon, DownloadIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { LogViewer } from '@patternfly/react-log-viewer';
import { downloadString } from '@odh-dashboard/internal/utilities/string';
import { RayJobKind } from '../../k8sTypes';
import useRayJobPods from '../../hooks/useRayJobPods';
import useFetchRayJobLogs from '../../hooks/useFetchRayJobLogs';
import { getDefaultPodContainerName } from '../trainingJobDetailsDrawer/utils';

type RayJobLogsTabProps = {
  job: RayJobKind;
};

const RayJobLogsTab: React.FC<RayJobLogsTabProps> = ({ job }) => {
  const [downloading, setDownloading] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);

  const { namespace } = job.metadata;
  const jobId = job.status?.jobId;
  const jobStatus = job.status?.jobStatus;
  const deploymentStatus = job.status?.jobDeploymentStatus;
  const isJobSubmitted =
    !!jobStatus ||
    deploymentStatus === 'Running' ||
    deploymentStatus === 'Complete' ||
    deploymentStatus === 'Failed';

  const { headPods, loaded: podsLoaded } = useRayJobPods(job);
  const headPodName = headPods.length > 0 ? headPods[0].metadata.name : undefined;
  const containerName =
    headPods.length > 0 ? getDefaultPodContainerName(headPods[0]) || undefined : undefined;

  const canFetchLogs = !!headPodName && !!containerName && !!jobId && isJobSubmitted;
  const isJobComplete = deploymentStatus === 'Complete' || deploymentStatus === 'Failed';
  const shouldRefreshLogs = canFetchLogs && !isJobComplete;

  const {
    data: logs,
    loaded: logsLoaded,
    error: logsError,
  } = useFetchRayJobLogs(namespace, headPodName, containerName, jobId, shouldRefreshLogs);

  const logViewerRef = React.useRef<{ scrollToBottom: () => void }>();

  React.useEffect(() => {
    if (!isPaused && logs && logViewerRef.current) {
      logViewerRef.current.scrollToBottom();
    }
  }, [isPaused, logs]);

  const onScroll: React.ComponentProps<typeof LogViewer>['onScroll'] = React.useCallback(
    ({
      scrollOffsetToBottom,
      scrollUpdateWasRequested,
    }: {
      scrollOffsetToBottom: number;
      scrollUpdateWasRequested: boolean;
    }) => {
      if (!scrollUpdateWasRequested) {
        if (scrollOffsetToBottom > 0) {
          setIsPaused(true);
        } else {
          setIsPaused(false);
        }
      }
    },
    [],
  );

  const handleDownload = React.useCallback(() => {
    if (!logs || !jobId) {
      return;
    }

    setDownloading(true);
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadString(`rayjob-${jobId}-${timestamp}.log`, logs);
    } finally {
      setDownloading(false);
    }
  }, [logs, jobId]);

  if (!podsLoaded) {
    return (
      <Bullseye className="pf-v6-u-mt-xl">
        <Spinner size="lg" />
      </Bullseye>
    );
  }

  if (!headPodName || !jobId) {
    const isCompleted = deploymentStatus === 'Complete' || deploymentStatus === 'Failed';

    let emptyMessage: string;
    if (!jobId) {
      emptyMessage = 'Job ID is not available yet. The job may still be initializing.';
    } else if (isCompleted) {
      emptyMessage =
        'The Ray cluster has been shut down. Logs are no longer available after the cluster is removed.';
    } else {
      emptyMessage = 'Head pod is not available. The Ray cluster may not have started yet.';
    }

    return (
      <EmptyState
        headingLevel="h4"
        icon={CubesIcon}
        titleText="Logs not available"
        data-testid="logs-empty-state"
      >
        <EmptyStateBody>{emptyMessage}</EmptyStateBody>
      </EmptyState>
    );
  }

  if (!canFetchLogs && headPodName && jobId) {
    return (
      <EmptyState
        headingLevel="h4"
        icon={CubesIcon}
        titleText="Waiting for job to start"
        data-testid="logs-waiting-state"
      >
        <EmptyStateBody>
          The Ray cluster is initializing. Logs will be available once the job starts running.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  const data = logs || '';
  const error = logsError;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 0' }}>
      <Toolbar>
        <ToolbarContent>
          <ToolbarGroup align={{ default: 'alignStart' }}>
            <ToolbarItem data-testid="logs-job-id">Job ID: {jobId}</ToolbarItem>
          </ToolbarGroup>
          <ToolbarGroup align={{ default: 'alignEnd' }}>
            <ToolbarItem>
              <Button
                variant="link"
                icon={<DownloadIcon />}
                onClick={handleDownload}
                isDisabled={!logs || downloading || !logsLoaded}
                isLoading={downloading}
                data-testid="logs-download-button"
              >
                Download
              </Button>
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>

      {error ? (
        <EmptyState headingLevel="h4" icon={ExclamationCircleIcon} titleText="Failed to load logs">
          <EmptyStateBody>Failed to load logs: {error.message}</EmptyStateBody>
        </EmptyState>
      ) : !logsLoaded ? (
        <Bullseye>
          <Spinner size="lg" />
        </Bullseye>
      ) : (
        <LogViewer
          data-testid="logs-log-viewer"
          data={data}
          innerRef={logViewerRef}
          height="60vh"
          hasLineNumbers
          isTextWrapped={false}
          onScroll={onScroll}
        />
      )}
    </div>
  );
};

export default RayJobLogsTab;

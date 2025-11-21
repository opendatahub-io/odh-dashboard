import * as React from 'react';
import {
  Bullseye,
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  EmptyState,
  EmptyStateBody,
  MenuToggle,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Truncate,
} from '@patternfly/react-core';
import { CubesIcon, DownloadIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { LogViewer } from '@patternfly/react-log-viewer';
import { PodKind } from '@odh-dashboard/internal/k8sTypes';
import { getPodContainerLogText } from '@odh-dashboard/internal/api/k8s/pods';
import { downloadString } from '@odh-dashboard/internal/utilities/string';
import { getDefaultPodContainerName } from './utils';
import { TrainJobKind } from '../../k8sTypes';
import useTrainJobPods from '../../hooks/useTrainJobPods';
import useFetchLogs from '../../hooks/useFetchLogs';

const LOG_TAIL_LINES = 500;

type TrainingJobLogsTabProps = {
  job: TrainJobKind;
  selectedPod: PodKind | null;
  selectedPodNameFromClick?: string;
  onPodChange: (pod: PodKind | null) => void;
};

const TrainingJobLogsTab: React.FC<TrainingJobLogsTabProps> = ({
  job,
  selectedPod,
  selectedPodNameFromClick,
  onPodChange,
}) => {
  const { pods, loaded: podsLoaded } = useTrainJobPods(job);
  const [isPodDropdownOpen, setIsPodDropdownOpen] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);

  // Handle pod selection from clicking pod name in Pods tab
  React.useEffect(() => {
    if (podsLoaded && pods.length > 0 && selectedPodNameFromClick) {
      const pod = pods.find((p) => p.metadata.name === selectedPodNameFromClick);
      if (pod) {
        onPodChange(pod);
      }
    }
  }, [podsLoaded, pods, selectedPodNameFromClick, onPodChange]);

  // Initialize selected pod when pods are loaded (default to first pod)
  React.useEffect(() => {
    if (podsLoaded && pods.length > 0 && !selectedPod && !selectedPodNameFromClick) {
      onPodChange(pods[0]);
    }
  }, [podsLoaded, pods, selectedPod, onPodChange, selectedPodNameFromClick]);

  // Get default container name for selected pod
  const containerName = React.useMemo(() => getDefaultPodContainerName(selectedPod), [selectedPod]);

  const podName = selectedPod?.metadata.name ?? '';
  const { namespace } = job.metadata;

  const {
    data: logs,
    loaded: logsLoaded,
    error: logsError,
  } = useFetchLogs(namespace, podName, containerName, !!podName && !!containerName, LOG_TAIL_LINES);

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

  const handleDownload = React.useCallback(async () => {
    if (!podName || !containerName) return;

    setDownloading(true);
    try {
      // The displayed logs are limited to LOG_TAIL_LINES (500) for performance.
      const content = await getPodContainerLogText(namespace, podName, containerName);
      const timestamp = new Date().toISOString();
      const isCompleted =
        selectedPod?.status?.phase === 'Succeeded' || selectedPod?.status?.phase === 'Failed';
      downloadString(
        `${podName}-${containerName}-${isCompleted ? 'full' : timestamp}.log`,
        content,
      );
    } catch (error) {
      console.error('Failed to download logs:', error);
    } finally {
      setDownloading(false);
    }
  }, [namespace, podName, containerName, selectedPod]);

  if (!podsLoaded) {
    return (
      <Bullseye className="pf-v6-u-mt-xl">
        <Spinner size="lg" />
      </Bullseye>
    );
  }

  if (pods.length === 0) {
    return (
      <EmptyState headingLevel="h4" icon={CubesIcon} titleText="No pods found">
        <EmptyStateBody>
          No pods are available for this training job. Pods may not have been created yet or may
          have been deleted.
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
          <ToolbarGroup align={{ default: 'alignStart' }} gap={{ default: 'gapSm' }}>
            <ToolbarItem>
              <span style={{ marginRight: '8px' }}>Pod:</span>
              <Dropdown
                isOpen={isPodDropdownOpen}
                onSelect={() => setIsPodDropdownOpen(false)}
                onOpenChange={(isOpen: boolean) => setIsPodDropdownOpen(isOpen)}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsPodDropdownOpen(!isPodDropdownOpen)}
                    isExpanded={isPodDropdownOpen}
                    isDisabled={!podsLoaded}
                    data-testid="logs-pod-selector"
                  >
                    <Truncate content={selectedPod?.metadata.name ?? 'Select pod...'} />
                  </MenuToggle>
                )}
                shouldFocusToggleOnSelect
              >
                <DropdownList>
                  {pods.map((pod) => (
                    <DropdownItem
                      key={pod.metadata.uid || pod.metadata.name}
                      onClick={() => {
                        onPodChange(pod);
                        setIsPodDropdownOpen(false);
                      }}
                      isSelected={selectedPod?.metadata.name === pod.metadata.name}
                    >
                      {pod.metadata.name}
                    </DropdownItem>
                  ))}
                </DropdownList>
              </Dropdown>
            </ToolbarItem>
          </ToolbarGroup>
          <ToolbarGroup align={{ default: 'alignEnd' }}>
            <ToolbarItem>
              <Button
                variant="link"
                icon={<DownloadIcon />}
                onClick={handleDownload}
                isDisabled={!podName || !containerName || downloading || !logsLoaded}
                isLoading={downloading}
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
        <Spinner size="lg" />
      ) : (
        <div style={{ height: '60vh' }}>
          <LogViewer
            data={data}
            innerRef={logViewerRef}
            height="100%"
            hasLineNumbers
            isTextWrapped={false}
            onScroll={onScroll}
          />
        </div>
      )}
    </div>
  );
};

export default TrainingJobLogsTab;

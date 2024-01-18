import React, { useEffect } from 'react';
import {
  Button,
  Tooltip,
  Spinner,
  Stack,
  StackItem,
  ToolbarContent,
  Toolbar,
  ToolbarItem,
  ToolbarGroup,
  DropdownList,
} from '@patternfly/react-core';
import { Dropdown, DropdownItem, KebabToggle } from '@patternfly/react-core/deprecated';
import OutlinedPlayCircleIcon from '@patternfly/react-icons/dist/esm/icons/outlined-play-circle-icon';
import PauseIcon from '@patternfly/react-icons/dist/esm/icons/pause-icon';
import PlayIcon from '@patternfly/react-icons/dist/esm/icons/play-icon';
import DownloadIcon from '@patternfly/react-icons/dist/esm/icons/download-icon';
import { LogViewer, LogViewerSearch } from '@patternfly/react-log-viewer';
import { CompressIcon, EllipsisVIcon, ExpandIcon } from '@patternfly/react-icons';
import { OutlinedWindowRestoreIcon } from '@patternfly/react-icons';
import DashboardLogViewer from '~/concepts/dashboard/DashboardLogViewer';
import { PipelineRunTaskDetails } from '~/concepts/pipelines/content/types';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import useFetchLogs from '~/concepts/k8s/pods/useFetchLogs';
import usePodContainerLogState from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/usePodContainerLogState';
import LogsTabStatus from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/LogsTabStatus';
import { LOG_TAIL_LINES } from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/const';
import { downloadCurrentStepLog, downloadAllStepLogs } from '~/concepts/k8s/pods/utils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import DownloadDropdown from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/DownloadDropdown';

// TODO: If this gets large enough we should look to make this its own component file
const LogsTab: React.FC<{ task: PipelineRunTaskDetails }> = ({ task }) => {
  const podName = task.runDetails?.status.podName;
  const isFailedPod = !!task.runDetails?.status.conditions.find((c) =>
    c.reason?.includes('Failed'),
  );

  if (!podName) {
    return <>No content</>;
  }

  return <LogsTabForPodName podName={podName} isFailedPod={isFailedPod} />;
};

/** Must be a non-empty podName -- use LogsTabForTask for safer usage */
const LogsTabForPodName: React.FC<{ podName: string; isFailedPod: boolean }> = ({
  podName,
  isFailedPod,
}) => {
  const { namespace } = usePipelinesAPI();
  const {
    pod,
    podLoaded,
    podStatus,
    podError,
    podContainers,
    selectedContainer,
    setSelectedContainer,
  } = usePodContainerLogState(podName);
  const [isPaused, setIsPaused] = React.useState(false);
  const [logs, logsLoaded, logsError] = useFetchLogs(
    podName,
    selectedContainer?.name ?? '',
    !isPaused,
    LOG_TAIL_LINES,
  );
  const [downloading, setDownloading] = React.useState(false);
  const [downloadError, setDownloadError] = React.useState<Error | undefined>();
  const logViewerRef = React.useRef<{ scrollToBottom: () => void }>();
  const [isFullScreen, setIsFullScreen] = React.useState(false);
  const [showSearchbar, setShowsearchbar] = React.useState(false);
  const [isKebabOpen, setIsKebabOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isPaused && logs) {
      if (logViewerRef && logViewerRef.current) {
        logViewerRef.current.scrollToBottom();
      }
    }
  }, [isPaused, logs]);

  const onScroll: React.ComponentProps<typeof LogViewer>['onScroll'] = ({
    scrollOffsetToBottom,
    scrollUpdateWasRequested,
  }) => {
    if (!scrollUpdateWasRequested) {
      if (scrollOffsetToBottom > 0) {
        setIsPaused(true);
      } else {
        setIsPaused(false);
      }
    }
  };

  const canDownloadAll = !!podContainers && !!pod && !downloading;
  const onDownloadAll = () => {
    if (!canDownloadAll) {
      return;
    }
    setDownloadError(undefined);
    setDownloading(true);
    downloadAllStepLogs(podContainers, namespace, pod)
      .catch((e) => setDownloadError(e))
      .finally(() => setDownloading(false));
  };

  const canDownload = !!selectedContainer && !!podName && !downloading;
  const onDownload = () => {
    if (!canDownload) {
      return;
    }
    setDownloadError(undefined);
    setDownloading(true);
    downloadCurrentStepLog(namespace, podName, selectedContainer.name, podStatus?.completed)
      .catch((e) => setDownloadError(e))
      .finally(() => setDownloading(false));
  };

  const onToggleExpand = (
    _evt: React.SyntheticEvent<HTMLButtonElement, Event>,
    showSearchbar: boolean,
  ) => {
    setShowsearchbar(!showSearchbar);
  };

  const handleFullScreen = () => {
    setIsFullScreen(!!document.fullscreenElement);
  };

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullScreen);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreen);
    };
  }, [isFullScreen]);

  const onExpandClick = () => {
    setIsKebabOpen(false);
    const element = document.querySelector('#dashboard-logviewer');

    if (!isFullScreen) {
      if (element?.requestFullscreen) {
        element.requestFullscreen();
      }
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullScreen(false);
    }
  };

  const error = podError || logsError || downloadError;
  const loaded = podLoaded && logsLoaded;
  let data: string;
  if (error || podStatus?.podInitializing) {
    data = '';
  } else if (!logsLoaded) {
    data = 'Loading...';
  } else if (logs) {
    data = logs;
  } else {
    data = 'No logs available';
  }

  return (
    <Stack hasGutter>
      <StackItem>
        {!podStatus?.podInitializing && (
          <LogsTabStatus
            podError={podError}
            podName={podName}
            podStatus={podStatus}
            loaded={loaded}
            error={error}
            isFailedPod={isFailedPod}
            isLogsAvailable={podContainers.length !== 1 && !!logs}
            onDownload={onDownloadAll}
          />
        )}
      </StackItem>
      <StackItem isFilled id="dashboard-logviewer">
        <DashboardLogViewer
          data={data}
          logViewerRef={logViewerRef}
          toolbar={
            !error && (
              <Toolbar className={isFullScreen ? 'pf-v5-u-p-sm' : ''}>
                <ToolbarContent>
                  <ToolbarGroup align={{ default: 'alignLeft' }} spacer={{ default: 'spacerNone' }}>
                    {!showSearchbar && (
                      <ToolbarItem spacer={{ default: 'spacerSm' }} style={{ maxWidth: '200px' }}>
                        <SimpleDropdownSelect
                          isDisabled={podContainers.length <= 1}
                          options={podContainers.map((container) => ({
                            key: container.name,
                            label: container.name,
                          }))}
                          value={selectedContainer?.name ?? ''}
                          placeholder="Select container..."
                          onChange={(v) => {
                            setSelectedContainer(podContainers.find((c) => c.name === v) ?? null);
                          }}
                        />
                      </ToolbarItem>
                    )}
                    <ToolbarItem spacer={{ default: 'spacerNone' }} style={{ maxWidth: '300px' }}>
                      <Tooltip content="Search">
                        <LogViewerSearch
                          onFocus={() => setIsPaused(true)}
                          placeholder="Search"
                          minSearchChars={0}
                          expandableInput={{
                            isExpanded: showSearchbar,
                            onToggleExpand,
                            toggleAriaLabel: 'Expandable search input toggle',
                          }}
                        />
                      </Tooltip>
                    </ToolbarItem>
                    {!podStatus?.completed && (
                      <ToolbarItem spacer={{ default: 'spacerNone' }}>
                        <Button
                          variant={!logsLoaded ? 'plain' : isPaused ? 'plain' : 'link'}
                          onClick={() => setIsPaused(!isPaused)}
                          isDisabled={!!error}
                        >
                          {!error &&
                            (!logsLoaded || podStatus?.podInitializing ? (
                              <Tooltip content="Loading log">
                                <Spinner size="sm" />
                              </Tooltip>
                            ) : isPaused ? (
                              <Tooltip content="Resume refreshing">
                                <PlayIcon />
                              </Tooltip>
                            ) : (
                              <Tooltip content="Pause refreshing">
                                <PauseIcon />
                              </Tooltip>
                            ))}
                        </Button>
                      </ToolbarItem>
                    )}
                  </ToolbarGroup>
                  <ToolbarGroup align={{ default: 'alignRight' }}>
                    <ToolbarItem spacer={{ default: 'spacerNone' }}>
                      {downloading ? <Spinner size="sm" /> : null}
                      {podContainers.length <= 1 ? (
                        <Tooltip position="top" content={<div>Download current step log</div>}>
                          <Button
                            onClick={onDownload}
                            variant="link"
                            aria-label="Download current step log"
                            icon={<DownloadIcon />}
                            isDisabled={!canDownload || !logs}
                          />
                        </Tooltip>
                      ) : (
                        <Tooltip content="Download">
                          <DownloadDropdown
                            onDownload={onDownload}
                            onDownloadAll={onDownloadAll}
                            isSingleStepLogsEmpty={!logs}
                          />
                        </Tooltip>
                      )}
                    </ToolbarItem>
                    <ToolbarItem spacer={{ default: 'spacerNone' }}>
                      <Dropdown
                        isPlain
                        position="right"
                        isOpen={isKebabOpen}
                        toggle={
                          <KebabToggle
                            onToggle={() => {
                              setIsKebabOpen(!isKebabOpen);
                            }}
                          >
                            <EllipsisVIcon />
                          </KebabToggle>
                        }
                      >
                        <DropdownList>
                          <DropdownItem
                            isDisabled={!logs}
                            onClick={() => {
                              const newTab = window.open();
                              newTab?.document.write(`<pre>${logs}</pre>`);
                            }}
                            component="button"
                            icon={<OutlinedWindowRestoreIcon />}
                            aria-label="View raw logs"
                          >
                            View raw log
                          </DropdownItem>
                          <DropdownItem
                            onClick={onExpandClick}
                            key="action"
                            icon={!isFullScreen ? <ExpandIcon /> : <CompressIcon />}
                            component="button"
                          >
                            {!isFullScreen ? 'Expand' : 'Collapse'}
                          </DropdownItem>
                        </DropdownList>
                      </Dropdown>
                    </ToolbarItem>
                  </ToolbarGroup>
                </ToolbarContent>
              </Toolbar>
            )
          }
          footer={
            isPaused &&
            !podStatus?.completed && (
              <Button onClick={() => setIsPaused(false)} isBlock icon={<OutlinedPlayCircleIcon />}>
                Resume refreshing log
              </Button>
            )
          }
          onScroll={onScroll}
        />
      </StackItem>
    </Stack>
  );
};

export default LogsTab;

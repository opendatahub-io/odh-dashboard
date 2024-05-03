import React, { useEffect } from 'react';
import {
  Button,
  Checkbox,
  DropdownList,
  Spinner,
  Stack,
  StackItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import { Dropdown, DropdownItem, KebabToggle } from '@patternfly/react-core/deprecated';
import { OutlinedPlayCircleIcon } from '@patternfly/react-icons/dist/esm/icons/outlined-play-circle-icon';
import { PauseIcon } from '@patternfly/react-icons/dist/esm/icons/pause-icon';
import { PlayIcon } from '@patternfly/react-icons/dist/esm/icons/play-icon';
import { DownloadIcon } from '@patternfly/react-icons/dist/esm/icons/download-icon';
import { LogViewer, LogViewerSearch } from '@patternfly/react-log-viewer';
import {
  CompressIcon,
  EllipsisVIcon,
  ExpandIcon,
  OutlinedWindowRestoreIcon,
} from '@patternfly/react-icons';
import DashboardLogViewer from '~/concepts/dashboard/DashboardLogViewer';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import useFetchLogs from '~/concepts/k8s/pods/useFetchLogs';
import usePodContainerLogState from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/usePodContainerLogState';
import LogsTabStatus from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/LogsTabStatus';
import { LOG_TAIL_LINES } from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/const';
import { downloadAllStepLogs, downloadCurrentStepLog } from '~/concepts/k8s/pods/utils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import DownloadDropdown from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/DownloadDropdown';
import useDebounceCallback from '~/utilities/useDebounceCallback';
import { PipelineTask } from '~/concepts/pipelines/topology';
import { ExecutionStateKF } from '~/concepts/pipelines/kfTypes';

// TODO: If this gets large enough we should look to make this its own component file
const LogsTab: React.FC<{ task: PipelineTask }> = ({ task }) => {
  const podName = task.status?.podName;
  const isFailedPod = task.status?.state === ExecutionStateKF.FAILED;

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
    podContainerStatuses,
    selectedContainer,
    setSelectedContainer,
  } = usePodContainerLogState(podName);
  const [isPaused, setIsPaused] = React.useState(false);
  const containerName = selectedContainer?.name ?? '';
  const [logs, logsLoaded, logsError] = useFetchLogs(
    podName,
    containerName,
    !isPaused,
    LOG_TAIL_LINES,
  );
  const sortedContainerStatuses = podContainers.map((podContainer) =>
    podContainerStatuses.find(
      (podContainerStatus) => podContainerStatus?.name === podContainer.name,
    ),
  );
  const [downloading, setDownloading] = React.useState(false);
  const [downloadError, setDownloadError] = React.useState<Error | undefined>();
  const logViewerRef = React.useRef<{ scrollToBottom: () => void }>();
  const [isFullScreen, setIsFullScreen] = React.useState(false);
  const [showSearchbar, setShowsearchbar] = React.useState(false);
  const [isKebabOpen, setIsKebabOpen] = React.useState(false);
  const [isTextWrapped, setIsTextWrapped] = React.useState(true);

  const logsTabRef = React.useRef<HTMLDivElement>(null);
  const dispatchResizeEvent = useDebounceCallback(
    React.useCallback(() => {
      window.dispatchEvent(new Event('resize'));
    }, []),
    100,
  );
  React.useEffect(() => {
    const observer = new ResizeObserver(() => {
      dispatchResizeEvent();
    });
    if (logsTabRef.current) {
      observer.observe(logsTabRef.current);
    }
    return () => {
      observer.disconnect();
    };
  }, [dispatchResizeEvent]);

  React.useEffect(() => {
    if (!isPaused && logs) {
      if (logViewerRef.current) {
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

  const canDownloadAll = !!pod && !downloading;
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
    isShowSearchbar: boolean,
  ) => {
    setShowsearchbar(!isShowSearchbar);
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
      if (document.fullscreenElement) {
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
  } else if (!logsLoaded || !podLoaded) {
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
      <StackItem isFilled id="dashboard-logviewer" style={{ position: 'relative' }}>
        {/* -33 to make room for the footer to pop in*/}
        <div
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: -33 }}
          ref={logsTabRef}
        >
          {/* 33 for the toolbar, 33 for the footer, and 1 because browser layout calculations sometimes go over by a fraction of a pixel */}
          <DashboardLogViewer
            height="calc(100% - 75px)"
            data={data}
            logViewerRef={logViewerRef}
            isTextWrapped={isTextWrapped}
            toolbar={
              !error && (
                <Toolbar className={isFullScreen ? 'pf-v5-u-p-sm' : ''}>
                  <ToolbarContent>
                    <ToolbarGroup
                      align={{ default: 'alignLeft' }}
                      spacer={{ default: 'spacerNone' }}
                    >
                      {!showSearchbar && (
                        <ToolbarItem spacer={{ default: 'spacerSm' }} style={{ maxWidth: '200px' }}>
                          <SimpleDropdownSelect
                            dataTestId="logs-step-select"
                            isDisabled={sortedContainerStatuses.length <= 1}
                            options={sortedContainerStatuses.map((containerStatus) => ({
                              key: containerStatus?.name || '',
                              label: containerStatus?.name || '',
                            }))}
                            value={containerName}
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
                            {!logsLoaded || podStatus?.podInitializing ? (
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
                            )}
                          </Button>
                        </ToolbarItem>
                      )}
                    </ToolbarGroup>
                    <ToolbarGroup align={{ default: 'alignRight' }}>
                      <ToolbarItem alignSelf="center">
                        <Checkbox
                          label="Wrap text"
                          aria-label="wrap text checkbox"
                          isChecked={isTextWrapped}
                          id="wrap-text-checkbox"
                          onChange={(_event, value) => setIsTextWrapped(value)}
                        />
                      </ToolbarItem>
                      <ToolbarItem spacer={{ default: 'spacerNone' }}>
                        {downloading && <Spinner size="sm" className="pf-v5-u-my-sm" />}
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
                              data-testid="logs-kebab-toggle"
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
                              href={`${location.origin}/api/k8s/api/v1/namespaces/${namespace}/pods/${podName}/log?container=${containerName}`}
                              component="a"
                              target="_blank"
                              rel="noopener noreferrer"
                              icon={<OutlinedWindowRestoreIcon />}
                              aria-label="View raw logs"
                              data-testid="raw-logs"
                            >
                              View raw logs
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
              logsLoaded &&
              isPaused &&
              !podStatus?.completed && (
                <Button
                  onClick={() => setIsPaused(false)}
                  isBlock
                  icon={<OutlinedPlayCircleIcon />}
                >
                  Resume refreshing log
                </Button>
              )
            }
            onScroll={onScroll}
          />
        </div>
      </StackItem>
    </Stack>
  );
};

export default LogsTab;

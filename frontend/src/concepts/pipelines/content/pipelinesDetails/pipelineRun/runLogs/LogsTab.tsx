import React, { useEffect } from 'react';
import {
  Button,
  Checkbox,
  DropdownGroup,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  Spinner,
  Stack,
  StackItem,
  Divider,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Tooltip,
  Truncate,
  Icon,
} from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons/dist/esm/icons/download-icon';
import { LogViewer, LogViewerSearch } from '@patternfly/react-log-viewer';
import {
  CompressIcon,
  EllipsisVIcon,
  ExpandIcon,
  OutlinedPauseCircleIcon,
  OutlinedPlayCircleIcon,
  OutlinedWindowRestoreIcon,
} from '@patternfly/react-icons';
import DashboardLogViewer from '#~/concepts/dashboard/DashboardLogViewer';
import useFetchLogs from '#~/concepts/k8s/pods/useFetchLogs';
import usePodContainerLogState from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/usePodContainerLogState';
import LogsTabStatus from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/LogsTabStatus';
import { LOG_TAIL_LINES } from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/const';
import { downloadAllStepLogs, downloadCurrentStepLog } from '#~/concepts/k8s/pods/utils';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import DownloadDropdown from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/DownloadDropdown';
import useDebounceCallback from '#~/utilities/useDebounceCallback';
import { PipelineTask } from '#~/concepts/pipelines/topology';
import { ExecutionStateKF } from '#~/concepts/pipelines/kfTypes';

interface LogsTabProps {
  task: PipelineTask;
  isCached: boolean;
}

const LogsTab: React.FC<LogsTabProps> = ({ task, isCached }) => {
  const { namespace } = usePipelinesAPI();
  const podName = isCached ? '' : task.status?.podName ?? '';
  const isFailedPod = task.status?.state === ExecutionStateKF.FAILED;
  const {
    pod,
    podLoaded,
    podStatus,
    podError,
    podContainers,
    selectedContainer,
    defaultContainerName,
    setSelectedContainer,
  } = usePodContainerLogState(podName);
  const [isPaused, setIsPaused] = React.useState(false);
  const containerName = selectedContainer?.name ?? '';
  const [open, setOpen] = React.useState(false);
  const [logs, logsLoaded, logsError] = useFetchLogs(
    podName,
    containerName,
    !isPaused,
    LOG_TAIL_LINES,
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

  // Scroll to bottom when log refreshes and streaming
  React.useEffect(() => {
    if (!isPaused && logs) {
      if (logViewerRef.current) {
        logViewerRef.current.scrollToBottom();
      }
    }
  }, [isPaused, logs]);

  React.useEffect(() => {
    const logWindowElement = document.querySelector(
      '#dashboard-logviewer .pf-v6-c-log-viewer__main',
    );
    if (logWindowElement) {
      logWindowElement.addEventListener('mousedown', () => setIsPaused(true));
    }
    return logWindowElement?.removeEventListener('mousedown', () => setIsPaused(true));
  }, []);

  const onScroll: React.ComponentProps<typeof LogViewer>['onScroll'] = ({
    scrollOffsetToBottom,
    scrollUpdateWasRequested,
  }) => {
    if (!podStatus?.completed && logsLoaded && !scrollUpdateWasRequested) {
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

  const onChange = (selectedContainerName: string) => {
    setSelectedContainer(podContainers.find((c) => c.name === selectedContainerName) ?? null);
    setOpen(false);
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
  if (error || podStatus?.podInitializing || isCached) {
    data = '';
  } else if (!logsLoaded || !podLoaded) {
    data = 'Loading...';
  } else if (logs) {
    data = logs;
  } else {
    data = 'No logs available';
  }

  const rawLogsLink = `${location.origin}/api/k8s/api/v1/namespaces/${namespace}/pods/${podName}/log?container=${containerName}`;

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
            isCached={isCached}
            isFailedPod={isFailedPod}
            isLogsAvailable={podContainers.length !== 1 && !!logs}
            onDownload={onDownload}
            onDownloadAll={onDownloadAll}
            rawLogsLink={rawLogsLink}
          />
        )}
      </StackItem>
      <StackItem isFilled id="dashboard-logviewer" style={{ position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            height: '50vh',
          }}
          ref={logsTabRef}
        >
          <DashboardLogViewer
            data={data}
            logViewerRef={logViewerRef}
            isTextWrapped={isTextWrapped}
            toolbar={
              !error &&
              !isCached && (
                <Toolbar className={isFullScreen ? 'pf-v6-u-p-sm' : ''}>
                  <ToolbarContent>
                    <ToolbarGroup align={{ default: 'alignStart' }} gap={{ default: 'gapNone' }}>
                      {!showSearchbar && (
                        <ToolbarItem gap={{ default: 'gapSm' }} style={{ maxWidth: '200px' }}>
                          <Dropdown
                            isOpen={open}
                            onSelect={() => setOpen(false)}
                            onOpenChange={(isOpen: boolean) => setOpen(isOpen)}
                            toggle={(toggleRef) => (
                              <MenuToggle
                                data-testid="logs-step-select"
                                ref={toggleRef}
                                isDisabled={podContainers.length <= 1}
                                onClick={() => setOpen(!open)}
                                isExpanded={open}
                              >
                                <Truncate
                                  content={
                                    podContainers.find((key) => key.name === containerName)?.name ??
                                    'Select container...'
                                  }
                                  className="truncate-no-min-width"
                                />
                              </MenuToggle>
                            )}
                            shouldFocusToggleOnSelect
                            popperProps={{ appendTo: 'inline' }}
                          >
                            {defaultContainerName && (
                              <>
                                <DropdownGroup label="Task output logs" key="Task output logs">
                                  <DropdownList>
                                    <DropdownItem
                                      key={defaultContainerName}
                                      onClick={() => onChange(defaultContainerName)}
                                    >
                                      {defaultContainerName}
                                    </DropdownItem>
                                  </DropdownList>
                                </DropdownGroup>
                                <Divider component="li" />
                              </>
                            )}
                            <DropdownGroup
                              label="Operation output logs"
                              key="Operation output logs"
                            >
                              <DropdownList>
                                {podContainers
                                  .filter(
                                    (podContainer) => podContainer.name !== defaultContainerName,
                                  )
                                  .map((container) => (
                                    <DropdownItem
                                      data-testid={`dropdown-item ${container.name}`}
                                      key={container.name}
                                      onClick={() => {
                                        onChange(container.name);
                                      }}
                                    >
                                      {container.name}
                                    </DropdownItem>
                                  ))}
                              </DropdownList>
                            </DropdownGroup>
                          </Dropdown>
                        </ToolbarItem>
                      )}
                      <ToolbarItem gap={{ default: 'gapNone' }} style={{ maxWidth: '300px' }}>
                        <LogViewerSearch
                          onFocus={() => {
                            if (!podStatus?.completed && logsLoaded) {
                              setIsPaused(true);
                            }
                          }}
                          placeholder="Search"
                          minSearchChars={0}
                          expandableInput={{
                            isExpanded: showSearchbar,
                            onToggleExpand,
                            toggleAriaLabel: 'Expandable search input toggle',
                          }}
                        />
                      </ToolbarItem>
                      {!podStatus?.completed && (
                        <ToolbarItem gap={{ default: 'gapNone' }}>
                          <Button
                            variant={!logsLoaded ? 'plain' : isPaused ? 'plain' : 'link'}
                            onClick={() => setIsPaused(!isPaused)}
                            isDisabled={!!error}
                            data-testid="logs-pause-refresh-button"
                          >
                            {isPaused ? (
                              <Tooltip content="Resume log streaming.">
                                <Icon iconSize="md">
                                  <OutlinedPlayCircleIcon />
                                </Icon>
                              </Tooltip>
                            ) : !logsLoaded || podStatus?.podInitializing ? (
                              <Tooltip content="Loading log">
                                <Spinner size="sm" />
                              </Tooltip>
                            ) : (
                              <Tooltip content="Pause log streaming.">
                                <Icon iconSize="md">
                                  <OutlinedPauseCircleIcon />
                                </Icon>
                              </Tooltip>
                            )}
                          </Button>
                        </ToolbarItem>
                      )}
                    </ToolbarGroup>
                    <ToolbarGroup align={{ default: 'alignEnd' }}>
                      <ToolbarItem alignSelf="center">
                        <Checkbox
                          label="Wrap text"
                          aria-label="wrap text checkbox"
                          isChecked={isTextWrapped}
                          id="wrap-text-checkbox"
                          onChange={(_event, value) => setIsTextWrapped(value)}
                        />
                      </ToolbarItem>
                      <ToolbarItem gap={{ default: 'gapNone' }}>
                        {downloading && <Spinner size="sm" className="pf-v6-u-my-sm" />}
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
                      <ToolbarItem gap={{ default: 'gapNone' }}>
                        <Dropdown
                          popperProps={{ position: 'right' }}
                          isOpen={isKebabOpen}
                          onOpenChange={(isOpen: boolean) => setIsKebabOpen(isOpen)}
                          toggle={(toggleRef) => (
                            <MenuToggle
                              ref={toggleRef}
                              variant="plain"
                              data-testid="logs-kebab-toggle"
                              onClick={() => {
                                setIsKebabOpen(!isKebabOpen);
                              }}
                              isExpanded={isKebabOpen}
                            >
                              <EllipsisVIcon />
                            </MenuToggle>
                          )}
                          shouldFocusToggleOnSelect
                        >
                          <DropdownList>
                            <DropdownItem
                              isDisabled={!logs}
                              to={rawLogsLink}
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
            onScroll={onScroll}
          />
        </div>
      </StackItem>
    </Stack>
  );
};

export default LogsTab;

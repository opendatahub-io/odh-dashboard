import React from 'react';
import {
  Button,
  Tooltip,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
  Alert,
  TextListItem,
  TextListItemVariants,
  TextContent,
  Spinner,
  AlertActionLink,
} from '@patternfly/react-core';
import OutlinedPlayCircleIcon from '@patternfly/react-icons/dist/esm/icons/outlined-play-circle-icon';
import PauseIcon from '@patternfly/react-icons/dist/esm/icons/pause-icon';
import PlayIcon from '@patternfly/react-icons/dist/esm/icons/play-icon';
import EllipsisVIcon from '@patternfly/react-icons/dist/esm/icons/ellipsis-v-icon';
import DownloadIcon from '@patternfly/react-icons/dist/esm/icons/download-icon';
import { LogViewer } from '@patternfly/react-log-viewer';
import { PipelineRunTaskDetails } from '~/concepts/pipelines/content/types';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import useFetchLogs from '~/concepts/k8s/pods/useFetchLogs';
import usePodContainerState from '~/concepts/k8s/pods/usePodContainerState';

type LogsTabProps = {
  task: PipelineRunTaskDetails;
  isHidden: boolean;
};

const LogsTab: React.FC<LogsTabProps> = ({ task, isHidden }) => {
  const podName = task.runDetails?.status.podName ?? '';
  const { podContainers, selectedContainer, setSelectedContainer } = usePodContainerState(podName);
  const [logs, loaded, error, refresh] = useFetchLogs(podName, selectedContainer?.name ?? '');
  const [reRenderKey, setReRenderKey] = React.useState(0);
  let data = 'No logs available';
  if (logs) {
    data = !loaded ? 'Loading...' : logs;
  }
  const refreshRate = 3000;
  const maxLines = 500;

  const [isPaused, setIsPaused] = React.useState(false);
  const [isFullScreen] = React.useState(false);
  const logViewerRef = React.useRef<{ scrollToBottom: () => void }>();

  React.useEffect(() => {
    const interval = setTimeout(() => {
      if (isPaused) {
        refresh();
      }
    }, refreshRate);

    return () => clearInterval(interval);
  }, [refresh, isPaused]);

  React.useEffect(() => {
    setReRenderKey((key) => key + 1);
  }, [isHidden]);

  React.useEffect(() => {
    if (!isPaused) {
      if (logViewerRef && logViewerRef.current) {
        logViewerRef.current.scrollToBottom();
      }
    }
  }, [isPaused]);

  const onDownloadClick = () => {
    const element = document.createElement('a');
    const file = new Blob([data], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${podName}-${selectedContainer}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const onScroll: React.ComponentProps<typeof LogViewer>['onScroll'] = ({
    scrollOffsetToBottom,
    scrollDirection,
    scrollUpdateWasRequested,
  }) => {
    if (!scrollUpdateWasRequested) {
      if (scrollOffsetToBottom < 1) {
        setIsPaused(false);
      } else if (scrollDirection === 'backward') {
        setIsPaused(true);
      }
    }
  };

  return (
    <>
      {error ? (
        <Alert
          isExpandable
          isInline
          variant="danger"
          title="An error occurred while retrieving the requested logs"
          actionLinks={
            <React.Fragment>
              <AlertActionLink onClick={refresh}>Retry</AlertActionLink>
            </React.Fragment>
          }
        >
          <p>{error.message}</p>
          <p>
            <a onClick={refresh}>Retry</a>
          </p>
        </Alert>
      ) : !loaded ? (
        ''
      ) : (
        <Alert
          isExpandable
          isInline
          variant="warning"
          title="The log window displays partial content"
        >
          <p>
            The log refreshes every {Math.floor(refreshRate / 1000)} seconds and displays the latest{' '}
            {maxLines} lines. Exceptionally long lines are abridged. To view the full log for this
            task, you can{' '}
            <Button variant="link" isInline component="span" onClick={onDownloadClick}>
              download the selected container logs
            </Button>{' '}
            associated with it.
          </p>
        </Alert>
      )}
      <LogViewer
        key={reRenderKey}
        data={data}
        innerRef={logViewerRef}
        height={isFullScreen ? '100%' : 600}
        width={'100%'}
        toolbar={
          <Toolbar>
            <ToolbarContent>
              <ToolbarGroup alignment={{ default: 'alignLeft' }}>
                <ToolbarToggleGroup toggleIcon={<EllipsisVIcon />} breakpoint="md">
                  <ToolbarItem>
                    <TextContent>
                      <TextListItem component={TextListItemVariants.dt}>Container</TextListItem>
                    </TextContent>
                  </ToolbarItem>
                  <ToolbarItem variant="search-filter">
                    <SimpleDropdownSelect
                      options={podContainers.map((container) => ({
                        key: container.name,
                        label: container.name,
                      }))}
                      value={selectedContainer?.name ?? ''}
                      showTooltipValue={true}
                      placeholder="Select container..."
                      onChange={(v) =>
                        setSelectedContainer(podContainers.find((c) => c.name === v) ?? null)
                      }
                    />
                  </ToolbarItem>
                </ToolbarToggleGroup>
                <ToolbarItem>
                  <Button
                    variant={!loaded ? 'plain' : isPaused ? 'plain' : 'link'}
                    onClick={() => {
                      setIsPaused(!isPaused);
                    }}
                  >
                    {!loaded ? <Spinner size="sm" /> : isPaused ? <PlayIcon /> : <PauseIcon />}
                    {!loaded
                      ? ` Loading log`
                      : isPaused
                      ? ` Resume refreshing`
                      : ` Pause refreshing`}
                  </Button>
                </ToolbarItem>
              </ToolbarGroup>
              <ToolbarGroup variant="icon-button-group" alignment={{ default: 'alignRight' }}>
                <ToolbarItem>
                  <Tooltip position="top" content={<div>Download</div>}>
                    <Button
                      onClick={onDownloadClick}
                      variant="link"
                      aria-label="Download current logs"
                    >
                      <DownloadIcon />
                      Download
                    </Button>
                  </Tooltip>
                </ToolbarItem>
              </ToolbarGroup>
            </ToolbarContent>
          </Toolbar>
        }
        footer={
          isPaused && (
            <Button
              onClick={() => {
                setIsPaused(false);
              }}
              isBlock
              icon={<OutlinedPlayCircleIcon />}
            >
              Resume refreshing log
            </Button>
          )
        }
        onScroll={onScroll}
      />
    </>
  );
};

export default LogsTab;

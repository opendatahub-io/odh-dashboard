import React from 'react';
import {
  Button,
  Tooltip,
  TextListItem,
  TextListItemVariants,
  TextContent,
  Spinner,
  Stack,
  StackItem,
  Split,
  SplitItem,
  Bullseye,
  Truncate,
} from '@patternfly/react-core';
import {
  Dropdown,
  DropdownItem,
  DropdownToggle,
  KebabToggle,
} from '@patternfly/react-core/deprecated';
import OutlinedPlayCircleIcon from '@patternfly/react-icons/dist/esm/icons/outlined-play-circle-icon';
import PauseIcon from '@patternfly/react-icons/dist/esm/icons/pause-icon';
import PlayIcon from '@patternfly/react-icons/dist/esm/icons/play-icon';
import DownloadIcon from '@patternfly/react-icons/dist/esm/icons/download-icon';
import { PipelineRunTaskDetails } from '~/concepts/pipelines/content/types';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import useFetchLogs from '~/concepts/k8s/pods/useFetchLogs';
import usePodContainerLogState from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/usePodContainerLogState';
import { useWindowResize } from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/useWindowResize';
import LogsTabStatus from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/LogsTabStatus';
import { LOG_TAIL_LINES } from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/const';
import DashboardCodeEditor from '~/concepts/dashboard/codeEditor/DashboardCodeEditor';
import useCodeEditorAsLogs from '~/concepts/dashboard/codeEditor/useCodeEditorAsLogs';
import { downloadCurrentStepLog, downloadAllStepLogs } from '~/concepts/k8s/pods/utils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

// TODO: If this gets large enough we should look to make this its own component file
const LogsTab: React.FC<{ task: PipelineRunTaskDetails }> = ({ task }) => {
  const podName = task.runDetails?.status.podName;

  if (!podName) {
    return <>No content</>;
  }

  return <LogsTabForPodName podName={podName} />;
};

/** Must be a non-empty podName -- use LogsTabForTask for safer usage */
const LogsTabForPodName: React.FC<{ podName: string }> = ({ podName }) => {
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
  const [logs, logsLoaded, logsError, refreshLogs] = useFetchLogs(
    podName,
    selectedContainer?.name ?? '',
    !isPaused,
    LOG_TAIL_LINES,
  );
  const [downloading, setDownloading] = React.useState(false);
  const [downloadError, setDownloadError] = React.useState<Error | undefined>();
  const { scrollToBottom, onMount, editorOptions } = useCodeEditorAsLogs();
  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = React.useState(false);
  const { isSmallScreen } = useWindowResize();

  React.useEffect(() => {
    if (!isPaused && logs) {
      scrollToBottom();
    }
  }, [isPaused, logs, scrollToBottom]);

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
    data = 'No content';
  }

  return (
    <Stack hasGutter style={{ minHeight: 400 }}>
      <StackItem>
        {!podStatus?.podInitializing && (
          <LogsTabStatus
            loaded={loaded}
            error={error}
            refresh={refreshLogs}
            onDownload={onDownloadAll}
          />
        )}
      </StackItem>
      <StackItem>
        <Split hasGutter isWrappable>
          <SplitItem>
            <Split hasGutter>
              {isSmallScreen() ? null : (
                <SplitItem>
                  <Bullseye>
                    <TextContent>
                      <TextListItem component={TextListItemVariants.dt}>Step</TextListItem>
                    </TextContent>
                  </Bullseye>
                </SplitItem>
              )}
              <SplitItem>
                <SimpleDropdownSelect
                  isDisabled={podContainers.length === 0}
                  options={podContainers.map((container) => ({
                    key: container.name,
                    label: container.name,
                  }))}
                  value={selectedContainer?.name ?? ''}
                  placeholder="Select container..."
                  onChange={(v) => {
                    setSelectedContainer(podContainers.find((c) => c.name === v) ?? null);
                  }}
                  width={150}
                />
              </SplitItem>
            </Split>
          </SplitItem>
          <SplitItem>
            {!podStatus?.completed && (
              <Button
                variant={!logsLoaded ? 'plain' : isPaused ? 'plain' : 'link'}
                onClick={() => setIsPaused(!isPaused)}
                isDisabled={!!error}
              >
                {error ? (
                  'Error loading logs'
                ) : !logsLoaded || podStatus?.podInitializing ? (
                  <>
                    <Spinner size="sm" /> {isSmallScreen() ? 'Loading' : 'Loading log'}
                  </>
                ) : isPaused ? (
                  <>
                    <PlayIcon /> {isSmallScreen() ? 'Resume' : 'Resume refreshing'}
                  </>
                ) : (
                  <>
                    <PauseIcon /> {isSmallScreen() ? 'Pause' : 'Pause refreshing'}
                  </>
                )}
              </Button>
            )}
          </SplitItem>
          <SplitItem isFilled style={{ textAlign: 'right' }}>
            {downloading ? (
              <>
                <Spinner size="sm" />{' '}
              </>
            ) : null}
            {podContainers.length !== 0 ? (
              <Dropdown
                toggle={
                  isSmallScreen() ? (
                    <KebabToggle
                      onToggle={() => setIsDownloadDropdownOpen(!isDownloadDropdownOpen)}
                    />
                  ) : (
                    <DropdownToggle
                      id="download-steps-logs-toggle"
                      onToggle={() => setIsDownloadDropdownOpen(!isDownloadDropdownOpen)}
                    >
                      Download
                    </DropdownToggle>
                  )
                }
                isOpen={isDownloadDropdownOpen}
                isPlain={isSmallScreen()}
                dropdownItems={[
                  <DropdownItem key="current-container-logs" onClick={onDownload}>
                    <Truncate
                      content={isSmallScreen() ? 'Download current step log' : 'Current step log'}
                    />
                  </DropdownItem>,
                  <DropdownItem key="all-container-logs" onClick={onDownloadAll}>
                    <Truncate
                      content={isSmallScreen() ? 'Download all step logs' : 'All step logs'}
                    />
                  </DropdownItem>,
                ]}
              />
            ) : (
              <Tooltip position="top" content={<div>Download current step log</div>}>
                <Button
                  onClick={onDownload}
                  variant="link"
                  aria-label="Download current step log"
                  icon={<DownloadIcon />}
                  isDisabled={!canDownload}
                >
                  Download
                </Button>
              </Tooltip>
            )}
          </SplitItem>
        </Split>
      </StackItem>
      <StackItem isFilled>
        <DashboardCodeEditor
          onEditorDidMount={onMount}
          code={data}
          isReadOnly
          options={editorOptions}
        />
        {isPaused && (
          <Button onClick={() => setIsPaused(false)} isBlock icon={<OutlinedPlayCircleIcon />}>
            Resume refreshing log
          </Button>
        )}
      </StackItem>
    </Stack>
  );
};

export default LogsTab;

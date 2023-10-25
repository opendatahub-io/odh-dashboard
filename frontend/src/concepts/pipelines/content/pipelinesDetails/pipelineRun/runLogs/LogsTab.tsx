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
} from '@patternfly/react-core';
import OutlinedPlayCircleIcon from '@patternfly/react-icons/dist/esm/icons/outlined-play-circle-icon';
import PauseIcon from '@patternfly/react-icons/dist/esm/icons/pause-icon';
import PlayIcon from '@patternfly/react-icons/dist/esm/icons/play-icon';
import DownloadIcon from '@patternfly/react-icons/dist/esm/icons/download-icon';
import { PipelineRunTaskDetails } from '~/concepts/pipelines/content/types';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import useFetchLogs from '~/concepts/k8s/pods/useFetchLogs';
import usePodContainerLogState from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/usePodContainerLogState';
import LogsTabStatus from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/LogsTabStatus';
import { LOG_TAIL_LINES } from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/const';
import DashboardCodeEditor from '~/concepts/dashboard/codeEditor/DashboardCodeEditor';
import useCodeEditorAsLogs from '~/concepts/dashboard/codeEditor/useCodeEditorAsLogs';
import { downloadFullPodLog } from '~/concepts/k8s/pods/utils';
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
  const { podLoaded, podError, podContainers, selectedContainer, setSelectedContainer } =
    usePodContainerLogState(podName);
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

  React.useEffect(() => {
    if (!isPaused && logs) {
      scrollToBottom();
    }
  }, [isPaused, logs, scrollToBottom]);

  const canDownload = !!selectedContainer && !!podName && !downloading;
  const onDownload = () => {
    if (!canDownload) {
      return;
    }
    setDownloadError(undefined);
    setDownloading(true);
    downloadFullPodLog(namespace, podName, selectedContainer.name)
      .catch((e) => setDownloadError(e))
      .finally(() => setDownloading(false));
  };

  const error = podError || logsError || downloadError;
  const loaded = podLoaded && logsLoaded;

  let data: string;
  if (error) {
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
        <LogsTabStatus
          loaded={loaded}
          error={error}
          refresh={refreshLogs}
          onDownload={onDownload}
        />
      </StackItem>
      <StackItem>
        <Split hasGutter isWrappable>
          <SplitItem>
            <Split hasGutter>
              <SplitItem>
                <Bullseye>
                  <TextContent>
                    <TextListItem component={TextListItemVariants.dt}>Step</TextListItem>
                  </TextContent>
                </Bullseye>
              </SplitItem>
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
                  width={200}
                />
              </SplitItem>
            </Split>
          </SplitItem>
          <SplitItem>
            <Button
              variant={!logsLoaded ? 'plain' : isPaused ? 'plain' : 'link'}
              onClick={() => setIsPaused(!isPaused)}
              isDisabled={!!error}
            >
              {error ? (
                'Error loading logs'
              ) : !logsLoaded ? (
                <>
                  <Spinner size="sm" /> Loading log
                </>
              ) : isPaused ? (
                <>
                  <PlayIcon /> Resume refreshing
                </>
              ) : (
                <>
                  <PauseIcon /> Pause refreshing
                </>
              )}
            </Button>
          </SplitItem>
          <SplitItem isFilled style={{ textAlign: 'right' }}>
            <Tooltip position="top" content={<div>Download currently selected container</div>}>
              <Button
                onClick={onDownload}
                variant="link"
                aria-label="Download current logs"
                icon={<DownloadIcon />}
                isDisabled={!canDownload}
              >
                Download
              </Button>
            </Tooltip>
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

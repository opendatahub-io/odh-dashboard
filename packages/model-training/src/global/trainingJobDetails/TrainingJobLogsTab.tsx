import React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import DashboardLogViewer from '@odh-dashboard/internal/concepts/dashboard/DashboardLogViewer';
import { LOG_TAIL_LINES } from '@odh-dashboard/internal/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/const';
import useDebounceCallback from '@odh-dashboard/internal/utilities/useDebounceCallback';
import useTrainingJobFetchLogs from './useTrainingJobFetchLogs';
import useTrainingJobPodContainerLogState from './useTrainingJobPodContainerLogState';
import useFullscreenLogViewer from './useFullscreenLogViewer';
import useTrainingJobDownloads from './useTrainingJobDownloads';
import TrainingJobLogsTabStatus from './TrainingJobLogsTabStatus';
import TrainingJobLogsToolbar from './TrainingJobLogsToolbar';
import { PyTorchJobKind } from '../../k8sTypes';
import { PyTorchJobState } from '../../types';
import { getJobStatusFromPyTorchJob } from '../trainingJobList/utils';

interface TrainingJobLogsTabProps {
  job: PyTorchJobKind;
}

const TrainingJobLogsTab: React.FC<TrainingJobLogsTabProps> = ({ job }) => {
  const { namespace } = job.metadata;
  const { name: jobName } = job.metadata;
  const podName = `${jobName}-master-0`;

  const status = getJobStatusFromPyTorchJob(job);
  const isFailedJob = status === PyTorchJobState.FAILED;

  const {
    pod,
    podLoaded,
    podStatus,
    podError,
    podContainers,
    selectedContainer,
    defaultContainerName,
    setSelectedContainer,
  } = useTrainingJobPodContainerLogState(namespace, podName);

  const [isPaused, setIsPaused] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [showSearchbar, setShowSearchbar] = React.useState(false);
  const [isKebabOpen, setIsKebabOpen] = React.useState(false);
  const [isTextWrapped, setIsTextWrapped] = React.useState(false);

  const logViewerRef = React.useRef<{ scrollToBottom: () => void }>();

  const containerName = selectedContainer?.name ?? '';

  const [logs, logsLoaded, logsError] = useTrainingJobFetchLogs(
    namespace,
    podName,
    containerName,
    !isPaused,
    LOG_TAIL_LINES,
  );

  const { downloading, downloadError, onDownload, onDownloadAll } = useTrainingJobDownloads({
    namespace,
    podName,
    podContainers,
    selectedContainer,
    pod,
  });

  const { isFullScreen, onExpandClick } = useFullscreenLogViewer();

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
    if (!isPaused && logs && logViewerRef.current) {
      logViewerRef.current.scrollToBottom();
    }
  }, [isPaused, logs]);

  const handleExpandClick = React.useCallback(() => {
    setIsKebabOpen(false);
    onExpandClick();
  }, [onExpandClick]);

  const error = podError || logsError || downloadError;
  const loaded = podLoaded && logsLoaded;
  const hasLogs = !!logs;

  const [data, setData] = React.useState<string>('Loading...');

  React.useEffect(() => {
    let newData: string;
    if (error) {
      newData = '';
    } else if (!logsLoaded || !podLoaded) {
      newData = 'Loading...';
    } else {
      newData = logs || 'No logs available';
    }

    setData(newData);
  }, [logs, logsLoaded, podLoaded, error, podStatus?.podInitializing]);

  const rawLogsLink = `${location.origin}/api/k8s/api/v1/namespaces/${namespace}/pods/${podName}/log?container=${containerName}`;

  return (
    <Stack hasGutter>
      <StackItem>
        {!podStatus?.podInitializing && (
          <TrainingJobLogsTabStatus
            error={error}
            podError={podError}
            podName={podName}
            podStatus={podStatus}
            loaded={loaded}
            isFailedJob={isFailedJob}
            isLogsAvailable={hasLogs}
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
            hasLineNumbers
            data={data}
            logViewerRef={logViewerRef}
            toolbar={
              <TrainingJobLogsToolbar
                isPaused={isPaused}
                setIsPaused={setIsPaused}
                podContainers={podContainers}
                selectedContainer={selectedContainer}
                defaultContainerName={defaultContainerName}
                setSelectedContainer={setSelectedContainer}
                open={open}
                setOpen={setOpen}
                showSearchbar={showSearchbar}
                setShowSearchbar={setShowSearchbar}
                isKebabOpen={isKebabOpen}
                setIsKebabOpen={setIsKebabOpen}
                isTextWrapped={isTextWrapped}
                setIsTextWrapped={setIsTextWrapped}
                isFullScreen={isFullScreen}
                onExpandClick={handleExpandClick}
                downloading={downloading}
                onDownload={onDownload}
                onDownloadAll={onDownloadAll}
                rawLogsLink={rawLogsLink}
                hasLogs={hasLogs}
              />
            }
            footer={false}
            onScroll={() => {
              // Placeholder for future scroll handling
            }}
            height="100%"
            isTextWrapped={isTextWrapped}
          />
        </div>
      </StackItem>
    </Stack>
  );
};

export default TrainingJobLogsTab;

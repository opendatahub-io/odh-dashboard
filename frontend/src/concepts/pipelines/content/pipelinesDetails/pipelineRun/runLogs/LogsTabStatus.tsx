import * as React from 'react';
import { Alert, Button, Skeleton } from '@patternfly/react-core';
import { PodStatus } from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/utils';
import {
  LOG_REFRESH_RATE,
  LOG_TAIL_LINES,
} from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/const';

type LogsTabStatusProps = {
  podError?: Error;
  podName?: string;
  podStatus?: PodStatus | null;
  error?: Error;
  isLogsAvailable?: boolean;
  isFailedPod?: boolean;
  loaded: boolean;
  onDownload: () => void;
};

const LogsTabStatus: React.FC<LogsTabStatusProps> = ({
  error,
  isLogsAvailable,
  podError,
  podName,
  podStatus,
  loaded,
  isFailedPod,
  onDownload,
}) => {
  if (error) {
    const isNetworkError = error.message.includes('Failed to fetch');
    const podCondition = podStatus === null || (podError && podStatus?.completed);

    let errorAlertTitle;
    let errorAlertMessage;

    if (isNetworkError) {
      errorAlertTitle = `${error.message} logs`;
      errorAlertMessage =
        'Check your network connection. The system will recover the connection when the network is restored.';
    } else if (isFailedPod) {
      errorAlertTitle = 'Failed to retrieve logs';
      errorAlertMessage = `Pod ${podName} failed during initialization`;
    } else if (podCondition) {
      errorAlertTitle = podError?.message;
      errorAlertMessage = `${podName} may have been pruned to prevent over-utilization of resources.`;
    } else {
      errorAlertTitle = 'An error occurred while retrieving the requested logs';
      errorAlertMessage = error.message;
    }
    return (
      <Alert component="h2" isInline variant="danger" title={errorAlertTitle}>
        <p>{errorAlertMessage}</p>
      </Alert>
    );
  }

  if (!loaded) {
    // Size of the expandable alert about logs (see below)
    return <Skeleton height="55px" width="100%" />;
  }

  return (
    <Alert
      data-testid="logs-success-alert"
      component="h2"
      isExpandable
      isInline
      variant="warning"
      title="The log window displays partial content"
    >
      <p>
        The log refreshes every {Math.floor(LOG_REFRESH_RATE / 1000)} seconds and displays the
        latest {LOG_TAIL_LINES} lines. To view the full log for this task, you can{' '}
        <Button isDisabled={!isLogsAvailable} variant="link" isInline onClick={onDownload}>
          download all step logs
        </Button>{' '}
        associated with it.
      </p>
    </Alert>
  );
};

export default LogsTabStatus;

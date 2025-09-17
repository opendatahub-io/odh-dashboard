import React from 'react';
import { Alert, Button, Skeleton } from '@patternfly/react-core';

interface TrainingJobLogsTabStatusProps {
  error?: Error;
  podError?: Error;
  podName: string;
  podStatus?: {
    podInitializing?: boolean;
    completed?: boolean;
  } | null;
  loaded: boolean;
  isFailedJob: boolean;
  isLogsAvailable: boolean;
  onDownloadAll: () => void;
  rawLogsLink: string;
}

const TrainingJobLogsTabStatus: React.FC<TrainingJobLogsTabStatusProps> = ({
  error,
  podError,
  podName,
  podStatus,
  loaded,
  isFailedJob,
  isLogsAvailable,
  onDownloadAll,
  rawLogsLink,
}) => {
  if (error) {
    const isNetworkError = error.message.includes('Failed to fetch');
    const podCondition = podStatus === null || (podError && podStatus?.completed);

    let errorAlertTitle: string;
    let errorAlertMessage: string;

    if (isNetworkError) {
      errorAlertTitle = `${error.message} logs`;
      errorAlertMessage =
        'Check your network connection. The system will recover the connection when the network is restored.';
    } else if (isFailedJob) {
      errorAlertTitle = 'Failed to retrieve logs';
      errorAlertMessage = `Pod ${podName} failed during initialization`;
    } else if (podCondition) {
      errorAlertTitle = podError?.message || 'Pod error';
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
    return <Skeleton height="55px" width="100%" />;
  }

  return (
    <Alert
      data-testid="logs-success-alert"
      component="h2"
      isInline
      variant="success"
      title="Training job logs"
    >
      <p>
        Logs are refreshed automatically. To view the complete logs,{' '}
        <Button
          isDisabled={!isLogsAvailable}
          variant="link"
          component="a"
          href={rawLogsLink}
          target="_blank"
          rel="noopener noreferrer"
          isInline
        >
          view raw logs
        </Button>{' '}
        or{' '}
        <Button isDisabled={!isLogsAvailable} variant="link" isInline onClick={onDownloadAll}>
          download all logs
        </Button>
        .
      </p>
    </Alert>
  );
};

export default TrainingJobLogsTabStatus;

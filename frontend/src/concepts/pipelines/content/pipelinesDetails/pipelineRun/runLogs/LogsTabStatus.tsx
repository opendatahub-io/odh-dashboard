import * as React from 'react';
import { Alert, AlertActionLink, Button, Skeleton } from '@patternfly/react-core';
import {
  LOG_REFRESH_RATE,
  LOG_TAIL_LINES,
} from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/const';

type LogsTabStatusProps = {
  error?: Error;
  isLogsAvailable?: boolean;
  loaded: boolean;
  refresh: () => void;
  onDownload: () => void;
};

const LogsTabStatus: React.FC<LogsTabStatusProps> = ({
  error,
  isLogsAvailable,
  loaded,
  refresh,
  onDownload,
}) => {
  if (error) {
    return (
      <Alert
        isInline
        variant="danger"
        title="An error occurred while retrieving the requested logs"
        actionLinks={<AlertActionLink onClick={refresh}>Retry</AlertActionLink>}
      >
        <p>{error.message}</p>
      </Alert>
    );
  }

  if (!loaded) {
    // Size of the expandable alert about logs (see below)
    return <Skeleton height="55px" width="100%" />;
  }

  return (
    <Alert isExpandable isInline variant="warning" title="The log window displays partial content">
      <p>
        The log refreshes every {Math.floor(LOG_REFRESH_RATE / 1000)} seconds and displays the
        latest {LOG_TAIL_LINES} lines. Exceptionally long lines are abridged. To view the full log
        for this task, you can{' '}
        <Button
          isDisabled={!onDownload || !isLogsAvailable}
          variant="link"
          isInline
          onClick={onDownload}
        >
          download all step logs
        </Button>{' '}
        associated with it.
      </p>
    </Alert>
  );
};

export default LogsTabStatus;

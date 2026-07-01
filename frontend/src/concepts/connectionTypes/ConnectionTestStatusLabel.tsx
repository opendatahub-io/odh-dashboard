import React from 'react';
import { Label, Spinner, Tooltip } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { ConnectionTestStatus } from '#~/concepts/connectionTypes/types';

type ConnectionTestStatusLabelProps = {
  status: ConnectionTestStatus;
  timestamp?: string;
};

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const ConnectionTestStatusLabel: React.FC<ConnectionTestStatusLabelProps> = ({
  status,
  timestamp,
}) => {
  switch (status) {
    case ConnectionTestStatus.NOT_TESTED:
      return (
        <Label color="grey" data-testid="connection-test-label-not-tested">
          Not tested
        </Label>
      );
    case ConnectionTestStatus.TESTING:
      return (
        <Label
          color="grey"
          icon={<Spinner size="sm" aria-label="Testing connection" />}
          data-testid="connection-test-label-testing"
        >
          Testing...
        </Label>
      );
    case ConnectionTestStatus.VERIFIED: {
      const label = (
        <Label
          color="green"
          icon={<CheckCircleIcon />}
          data-testid="connection-test-label-verified"
        >
          Verified
        </Label>
      );
      return timestamp ? (
        <Tooltip content={`Last tested ${formatTimestamp(timestamp)}`}>{label}</Tooltip>
      ) : (
        label
      );
    }
    case ConnectionTestStatus.FAILED: {
      const label = (
        <Label
          color="red"
          icon={<ExclamationCircleIcon />}
          data-testid="connection-test-label-failed"
        >
          Failed
        </Label>
      );
      return timestamp ? (
        <Tooltip content={`Last tested ${formatTimestamp(timestamp)}`}>{label}</Tooltip>
      ) : (
        label
      );
    }
    default:
      return null;
  }
};

export default ConnectionTestStatusLabel;

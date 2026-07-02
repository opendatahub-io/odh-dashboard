import React from 'react';
import { Label, Spinner, Stack, StackItem } from '@patternfly/react-core';
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
        <Label variant="outline" color="grey" data-testid="connection-test-label-not-tested">
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
    case ConnectionTestStatus.VERIFIED:
      return (
        <Stack data-testid="connection-test-label-verified">
          <StackItem>
            <Label variant="outline" color="green" icon={<CheckCircleIcon />}>
              Verified
            </Label>
          </StackItem>
          {timestamp ? (
            <StackItem className="pf-v6-u-font-size-xs pf-v6-u-color-200">
              Last tested {formatTimestamp(timestamp)}
            </StackItem>
          ) : null}
        </Stack>
      );
    case ConnectionTestStatus.FAILED:
      return (
        <Stack data-testid="connection-test-label-failed">
          <StackItem>
            <Label variant="outline" color="red" icon={<ExclamationCircleIcon />}>
              Failed
            </Label>
          </StackItem>
          {timestamp ? (
            <StackItem className="pf-v6-u-font-size-xs pf-v6-u-color-200">
              Last tested {formatTimestamp(timestamp)}
            </StackItem>
          ) : null}
        </Stack>
      );
    default:
      return null;
  }
};

export default ConnectionTestStatusLabel;

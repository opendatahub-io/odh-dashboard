import React from 'react';
import { Label, Spinner, Stack, StackItem } from '@patternfly/react-core';
import { ConnectionTestStatus } from '#~/concepts/connectionTypes/types';

type ConnectionTestStatusLabelProps = {
  status: ConnectionTestStatus;
  timestamp?: string;
};

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString();
};

const ConnectionTestStatusLabel: React.FC<ConnectionTestStatusLabelProps> = ({
  status,
  timestamp,
}) => {
  switch (status) {
    case ConnectionTestStatus.NOT_TESTED:
      return (
        <Label variant="outline" data-testid="connection-test-label-not-tested">
          Not tested
        </Label>
      );
    case ConnectionTestStatus.TESTING:
      return (
        <Label
          variant="outline"
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
            <Label status="success" variant="outline">
              Verified
            </Label>
          </StackItem>
          {timestamp && formatTimestamp(timestamp) ? (
            <StackItem className="pf-v6-u-font-size-xs pf-v6-u-text-color-subtle">
              Last tested {formatTimestamp(timestamp)}
            </StackItem>
          ) : null}
        </Stack>
      );
    case ConnectionTestStatus.FAILED:
      return (
        <Stack data-testid="connection-test-label-failed">
          <StackItem>
            <Label status="danger" variant="outline">
              Failed
            </Label>
          </StackItem>
          {timestamp && formatTimestamp(timestamp) ? (
            <StackItem className="pf-v6-u-font-size-xs pf-v6-u-text-color-subtle">
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

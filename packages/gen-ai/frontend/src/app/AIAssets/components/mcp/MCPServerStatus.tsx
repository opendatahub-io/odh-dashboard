import * as React from 'react';
import { Label, Spinner, Tooltip } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InfoCircleIcon,
  QuestionCircleIcon,
} from '@patternfly/react-icons';
import { MCPServerUIStatus } from '~/app/types';

interface MCPServerStatusProps {
  status: MCPServerUIStatus;
  message?: string;
  isLoading?: boolean;
}

const MCPServerStatus: React.FC<MCPServerStatusProps> = ({
  status,
  message = 'Status unknown',
  isLoading = false,
}) => {
  const statusLabel = React.useMemo(() => {
    switch (status) {
      case 'connected':
        return (
          <Label color="green" href="#filled" icon={<CheckCircleIcon />}>
            Active
          </Label>
        );
      case 'auth_required':
        return (
          <Label color="yellow" href="#filled" icon={<InfoCircleIcon />}>
            Token Required
          </Label>
        );
      case 'unreachable':
        return (
          <Label color="red" href="#filled" icon={<ExclamationCircleIcon />}>
            Error
          </Label>
        );
      default:
        return (
          <Label color="grey" href="#filled" icon={<QuestionCircleIcon />}>
            Unknown
          </Label>
        );
    }
  }, [status]);

  if (isLoading || status === 'checking') {
    return (
      <Tooltip content="Checking connection status...">
        <Label color="teal" variant="outline" href="#filled" icon={<Spinner size="sm" />}>
          Loading
        </Label>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={message}>
      <span>{statusLabel}</span>
    </Tooltip>
  );
};

export default MCPServerStatus;

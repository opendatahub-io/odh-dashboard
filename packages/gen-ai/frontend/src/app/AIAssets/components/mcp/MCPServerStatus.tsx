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
          <Label status="success" icon={<CheckCircleIcon />} variant="outline">
            Ready
          </Label>
        );
      case 'auth_required':
        return (
          <Label status="warning" icon={<InfoCircleIcon />} variant="outline">
            Token Required
          </Label>
        );
      case 'unreachable':
        return (
          <Label status="danger" icon={<ExclamationCircleIcon />} variant="outline">
            Error
          </Label>
        );
      default:
        return (
          <Label color="grey" icon={<QuestionCircleIcon />} variant="outline">
            Unknown
          </Label>
        );
    }
  }, [status]);

  if (isLoading || status === 'checking') {
    return (
      <Tooltip content="Checking connection status...">
        <Label color="teal" icon={<Spinner size="sm" />} data-testid="mcp-server-status-badge">
          Loading
        </Label>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={message}>
      <span data-testid="mcp-server-status-badge">{statusLabel}</span>
    </Tooltip>
  );
};

export default MCPServerStatus;

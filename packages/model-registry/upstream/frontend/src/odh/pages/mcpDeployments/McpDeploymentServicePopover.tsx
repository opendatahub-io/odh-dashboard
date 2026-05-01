import * as React from 'react';
import { Button, ClipboardCopy, Popover } from '@patternfly/react-core';
import { McpDeployment } from '~/odh/types/mcpDeploymentTypes';
import { getConnectionUrl } from './utils';

type McpDeploymentServicePopoverProps = {
  deployment: McpDeployment;
};

const McpDeploymentServicePopover: React.FC<McpDeploymentServicePopoverProps> = ({
  deployment,
}) => {
  const connectionUrl = getConnectionUrl(deployment);

  if (!connectionUrl) {
    return <span data-testid="mcp-deployment-service-unavailable">&ndash;</span>;
  }

  return (
    <Popover
      headerContent="Connection URL"
      bodyContent={
        <ClipboardCopy
          isReadOnly
          variant="inline-compact"
          hoverTip="Copy"
          clickTip="Copied"
          data-testid="mcp-deployment-connection-url"
        >
          {connectionUrl}
        </ClipboardCopy>
      }
      data-testid="mcp-deployment-service-popover"
    >
      <Button variant="link" isInline data-testid="mcp-deployment-service-view">
        View
      </Button>
    </Popover>
  );
};

export default McpDeploymentServicePopover;

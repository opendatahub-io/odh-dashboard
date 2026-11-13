import * as React from 'react';
import { Button, ClipboardCopy, Content, Popover, Stack, StackItem } from '@patternfly/react-core';
import { McpDeployment } from '~/odh/types/mcpDeploymentTypes';
import { getConnectionUrl, isClusterLocalConnectionUrl } from './utils';

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
      headerContent="Connection details"
      bodyContent={
        <Stack hasGutter>
          {deployment.gatewayAddress?.url && (
            <StackItem>
              <Content component="small">
                <b>Gateway endpoint</b>
              </Content>
              <Content component="small">
                Use this URL with an MCP client through the configured Gateway.
              </Content>
              <ClipboardCopy
                isReadOnly
                variant="inline-compact"
                hoverTip="Copy"
                clickTip="Copied"
                data-testid="mcp-deployment-gateway-url"
              >
                {deployment.gatewayAddress.url}
              </ClipboardCopy>
            </StackItem>
          )}
          <StackItem>
            <Content component="small">
              <b>Cluster-local service URL</b>
            </Content>
            <Content component="small">
              {isClusterLocalConnectionUrl(connectionUrl)
                ? 'Usable by in-cluster MCP clients; it will not open from your browser.'
                : 'Use this URL only when the client can reach the service directly.'}
            </Content>
            <ClipboardCopy
              isReadOnly
              variant="inline-compact"
              hoverTip="Copy"
              clickTip="Copied"
              data-testid="mcp-deployment-connection-url"
            >
              {connectionUrl}
            </ClipboardCopy>
          </StackItem>
        </Stack>
      }
      data-testid="mcp-deployment-service-popover"
    >
      <Button variant="link" isInline data-testid="mcp-deployment-service-view">
        View connection details
      </Button>
    </Popover>
  );
};

export default McpDeploymentServicePopover;

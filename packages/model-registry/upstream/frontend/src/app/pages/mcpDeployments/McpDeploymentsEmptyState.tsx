import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateVariant } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';

const McpDeploymentsEmptyState: React.FC = () => (
  <EmptyState
    icon={CubesIcon}
    titleText="No MCP server deployments"
    variant={EmptyStateVariant.lg}
    data-testid="mcp-deployments-empty-state"
  >
    <EmptyStateBody>
      No MCP server deployments have been created yet. Deploy an MCP server from the catalog to get
      started.
    </EmptyStateBody>
  </EmptyState>
);

export default McpDeploymentsEmptyState;

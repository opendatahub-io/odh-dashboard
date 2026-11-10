import React from 'react';
import ExternalLink from '~/app/shared/components/ExternalLink';
import { MCP_GATEWAY_SETUP_DOCS_URL } from '~/odh/const';

const McpGatewayDocsLink: React.FC = () => (
  <ExternalLink
    text="How to set up an MCP gateway"
    to={MCP_GATEWAY_SETUP_DOCS_URL}
    testId="mcp-deploy-gateway-docs-link"
  />
);

export default McpGatewayDocsLink;

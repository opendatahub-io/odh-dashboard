import * as React from 'react';
import { Popover, ClipboardCopy, Content, ContentVariants } from '@patternfly/react-core';
import { Link } from 'react-router-dom';

const MCP_CATALOG_PATH = '/ai-hub/mcp-servers';

interface MCPServerEndpointPopoverProps {
  connectionUrl: string;
  source?: string;
  children: React.ReactElement;
}

const MCPServerEndpointPopover: React.FC<MCPServerEndpointPopoverProps> = ({
  connectionUrl,
  children,
  source,
}) => (
  <Popover
    headerContent="Service endpoint"
    headerComponent="h2"
    bodyContent={
      <div className="pf-v6-u-mt-md">
        <ClipboardCopy isReadOnly hoverTip="Copy endpoint" clickTip="Copied">
          {connectionUrl}
        </ClipboardCopy>
        {source === 'registry' && (
          <Content component={ContentVariants.small} className="pf-v6-u-mt-md">
            For authentication information refer to the{' '}
            <Link to={MCP_CATALOG_PATH}>catalog listing</Link> for this server.
          </Content>
        )}
      </div>
    }
    position="top-start"
  >
    {children}
  </Popover>
);

export default MCPServerEndpointPopover;

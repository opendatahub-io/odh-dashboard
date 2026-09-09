import * as React from 'react';
import { Popover, ClipboardCopy, Content, ContentVariants } from '@patternfly/react-core';

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
      <>
        <ClipboardCopy isReadOnly hoverTip="Copy" clickTip="Copied">
          {connectionUrl}
        </ClipboardCopy>
        {source === 'registry' && (
          <Content component={ContentVariants.small} className="pf-v6-u-mt-sm">
            For authentication information refer to the{' '}
            <a href={MCP_CATALOG_PATH}>catalog listing</a> for this server.
          </Content>
        )}
      </>
    }
    position="top-start"
  >
    {children}
  </Popover>
);

export default MCPServerEndpointPopover;

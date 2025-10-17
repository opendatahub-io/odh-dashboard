import * as React from 'react';
import { Popover, ClipboardCopy } from '@patternfly/react-core';

interface MCPServerEndpointPopoverProps {
  connectionUrl: string;
  children: React.ReactElement;
}

const MCPServerEndpointPopover: React.FC<MCPServerEndpointPopoverProps> = ({
  connectionUrl,
  children,
}) => (
  <Popover
    headerContent="Endpoint URL"
    headerComponent="h2"
    bodyContent={
      <ClipboardCopy isReadOnly hoverTip="Copy" clickTip="Copied">
        {connectionUrl}
      </ClipboardCopy>
    }
    position="top-start"
  >
    {children}
  </Popover>
);

export default MCPServerEndpointPopover;

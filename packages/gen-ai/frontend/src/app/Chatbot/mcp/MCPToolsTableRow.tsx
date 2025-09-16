import * as React from 'react';
import { Label, Truncate } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { TruncatedText } from 'mod-arch-shared';
import { MCPTool } from '~/app/types';

interface MCPToolsTableRowProps {
  tool: MCPTool;
}

const MCPToolsTableRow: React.FC<MCPToolsTableRowProps> = ({ tool }) => (
  <Tr>
    <Td
      dataLabel="Name and Permissions"
      className="pf-v6-u-align-items-center pf-v6-u-py-sm pf-v6-u-px-sm"
      style={{
        minWidth: '300px',
      }}
    >
      <div
        className="pf-v6-u-display-flex pf-v6-u-align-items-center pf-v6-u-gap-sm"
        style={{
          minWidth: '300px',
          gap: '0.5rem',
        }}
      >
        <Truncate content={tool.name} className="pf-v6-u-font-family-monospace" />

        {tool.permissions.map((permission) => (
          <Label isCompact key={permission} color="blue">
            {permission}
          </Label>
        ))}
      </div>
    </Td>
    <Td dataLabel="Description" className="pf-v6-u-align-items-center pf-v6-u-py-sm pf-v6-u-px-sm">
      <TruncatedText maxLines={2} content={tool.description} />
    </Td>
  </Tr>
);

export default MCPToolsTableRow;

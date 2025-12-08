import * as React from 'react';
import { Truncate } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { CheckboxTd, TruncatedText } from 'mod-arch-shared';
import { MCPTool } from '~/app/types';

interface MCPToolsTableRowProps {
  tool: MCPTool;
  isChecked: boolean;
  onToggleCheck: () => void;
}

const MCPToolsTableRow: React.FC<MCPToolsTableRowProps> = ({ tool, isChecked, onToggleCheck }) => (
  <Tr>
    <CheckboxTd id={tool.id} isChecked={isChecked} onToggle={onToggleCheck} />
    <Td dataLabel="Tool name">
      <Truncate content={tool.name} className="pf-v6-u-font-family-monospace" />
    </Td>
    <Td dataLabel="Description">
      <TruncatedText maxLines={2} content={tool.description} />
    </Td>
  </Tr>
);

export default MCPToolsTableRow;

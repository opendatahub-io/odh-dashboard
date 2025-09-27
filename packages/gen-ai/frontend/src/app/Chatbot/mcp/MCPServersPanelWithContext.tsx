import * as React from 'react';
import MCPServersPanel from './MCPServersPanel';

interface MCPServersPanelWithContextProps {
  onSelectionChange?: (selectedServers: string[]) => void;
}

/**
 * Wrapper component for the MCP servers panel.
 * Note: MCP contexts are now provided at the ChatbotPage level, so no additional context needed.
 */
const MCPServersPanelWithContext: React.FC<MCPServersPanelWithContextProps> = ({
  onSelectionChange,
}) => <MCPServersPanel onSelectionChange={onSelectionChange} />;

export default MCPServersPanelWithContext;

import * as React from 'react';
import { Label } from '@patternfly/react-core';
import { MCPServerFromAPI, TokenInfo } from '~/app/types';
import { ServerStatusInfo } from '~/app/hooks/useMCPServerStatuses';
import MCPServersPanel from '~/app/Chatbot/mcp/MCPServersPanel';
import TabContentWrapper from './TabContentWrapper';

interface MCPTabContentProps {
  mcpServers: MCPServerFromAPI[];
  mcpServersLoaded: boolean;
  mcpServersLoadError?: Error | null;
  mcpServerTokens: Map<string, TokenInfo>;
  onMcpServerTokensChange: (tokens: Map<string, TokenInfo>) => void;
  checkMcpServerStatus: (serverUrl: string, mcpBearerToken?: string) => Promise<ServerStatusInfo>;
  onMcpServersChange?: (serverIds: string[]) => void;
  initialSelectedServerIds?: string[];
  initialServerStatuses?: Map<string, ServerStatusInfo>;
  activeToolsCount: number;
  onActiveToolsCountChange: (count: number) => void;
  onToolsWarningChange: (show: boolean) => void;
}

const MCPTabContent: React.FunctionComponent<MCPTabContentProps> = ({
  mcpServers,
  mcpServersLoaded,
  mcpServersLoadError,
  mcpServerTokens,
  onMcpServerTokensChange,
  checkMcpServerStatus,
  onMcpServersChange,
  initialSelectedServerIds,
  initialServerStatuses,
  activeToolsCount,
  onActiveToolsCountChange,
  onToolsWarningChange,
}) => {
  const headerActions = (
    <Label variant="outline" color="blue" data-testid="active-tools-count-badge">
      {activeToolsCount} {activeToolsCount === 1 ? 'tool' : 'tools'} enabled
    </Label>
  );

  return (
    <TabContentWrapper
      title="MCP servers"
      headerActions={headerActions}
      headerActionsPosition="inline"
      titleTestId="mcp-servers-section-title"
    >
      <MCPServersPanel
        servers={mcpServers}
        serversLoaded={mcpServersLoaded}
        serversLoadError={mcpServersLoadError}
        serverTokens={mcpServerTokens}
        onServerTokensChange={onMcpServerTokensChange}
        checkServerStatus={checkMcpServerStatus}
        onSelectionChange={onMcpServersChange}
        initialSelectedServerIds={initialSelectedServerIds}
        initialServerStatuses={initialServerStatuses}
        onToolsWarningChange={onToolsWarningChange}
        onActiveToolsCountChange={onActiveToolsCountChange}
      />
    </TabContentWrapper>
  );
};

export default MCPTabContent;

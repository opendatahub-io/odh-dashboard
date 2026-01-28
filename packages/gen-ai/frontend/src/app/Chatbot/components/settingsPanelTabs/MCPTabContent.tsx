import * as React from 'react';
import { Label } from '@patternfly/react-core';
import { MCPServerFromAPI, TokenInfo } from '~/app/types';
import { ServerStatusInfo } from '~/app/hooks/useMCPServerStatuses';
import MCPServersPanel from '~/app/Chatbot/mcp/MCPServersPanel';
import TabContentWrapper from './TabContentWrapper';

interface MCPTabContentProps {
  configId: string;
  mcpServers: MCPServerFromAPI[];
  mcpServersLoaded: boolean;
  mcpServersLoadError?: Error | null;
  mcpServerTokens: Map<string, TokenInfo>;
  onMcpServerTokensChange: (tokens: Map<string, TokenInfo>) => void;
  checkMcpServerStatus: (serverUrl: string, mcpBearerToken?: string) => Promise<ServerStatusInfo>;
  initialServerStatuses?: Map<string, ServerStatusInfo>;
  activeToolsCount: number;
  onActiveToolsCountChange: (count: number) => void;
  onToolsWarningChange: (show: boolean) => void;
}

const MCPTabContent: React.FunctionComponent<MCPTabContentProps> = ({
  configId,
  mcpServers,
  mcpServersLoaded,
  mcpServersLoadError,
  mcpServerTokens,
  onMcpServerTokensChange,
  checkMcpServerStatus,
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
        configId={configId}
        servers={mcpServers}
        serversLoaded={mcpServersLoaded}
        serversLoadError={mcpServersLoadError}
        serverTokens={mcpServerTokens}
        onServerTokensChange={onMcpServerTokensChange}
        checkServerStatus={checkMcpServerStatus}
        initialServerStatuses={initialServerStatuses}
        onToolsWarningChange={onToolsWarningChange}
        onActiveToolsCountChange={onActiveToolsCountChange}
      />
    </TabContentWrapper>
  );
};

export default MCPTabContent;

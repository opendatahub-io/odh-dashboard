import * as React from 'react';
import { MCPServerFromAPI, TokenInfo } from '~/app/types';
import { ServerStatusInfo } from '~/app/hooks/useMCPServerStatuses';
import MCPServersPanel from '~/app/Chatbot/mcp/MCPServersPanel';
import TabContentWrapper from './TabContentWrapper';

interface MCPTabContentProps {
  configId: string;
  mcpServers: MCPServerFromAPI[];
  mcpServersLoaded: boolean;
  mcpServersLoadError?: Error | null;
  mcpRegistryAvailable?: boolean;
  mcpServerTokens: Map<string, TokenInfo>;
  onMcpServerTokensChange: (tokens: Map<string, TokenInfo>) => void;
  checkMcpServerStatus: (serverUrl: string, mcpBearerToken?: string) => Promise<ServerStatusInfo>;
  initialServerStatuses?: Map<string, ServerStatusInfo>;
  onActiveToolsCountChange: (count: number) => void;
  onToolsWarningChange: (show: boolean) => void;
}

const MCPTabContent: React.FunctionComponent<MCPTabContentProps> = ({
  configId,
  mcpServers,
  mcpServersLoaded,
  mcpServersLoadError,
  mcpRegistryAvailable,
  mcpServerTokens,
  onMcpServerTokensChange,
  checkMcpServerStatus,
  initialServerStatuses,
  onActiveToolsCountChange,
  onToolsWarningChange,
}) => (
  <TabContentWrapper title="MCP servers" titleTestId="mcp-servers-section-title">
    <MCPServersPanel
      key={configId}
      configId={configId}
      servers={mcpServers}
      serversLoaded={mcpServersLoaded}
      serversLoadError={mcpServersLoadError}
      registryAvailable={mcpRegistryAvailable}
      serverTokens={mcpServerTokens}
      onServerTokensChange={onMcpServerTokensChange}
      checkServerStatus={checkMcpServerStatus}
      initialServerStatuses={initialServerStatuses}
      onToolsWarningChange={onToolsWarningChange}
      onActiveToolsCountChange={onActiveToolsCountChange}
    />
  </TabContentWrapper>
);

export default MCPTabContent;

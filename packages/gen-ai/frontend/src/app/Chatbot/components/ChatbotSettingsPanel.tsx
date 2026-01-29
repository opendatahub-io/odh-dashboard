import * as React from 'react';
import {
  DrawerPanelContent,
  DrawerPanelBody,
  Badge,
  Flex,
  FlexItem,
  Icon,
  Tabs,
  Tab,
  TabTitleText,
  Tooltip,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import {
  useChatbotConfigStore,
  selectSystemInstruction,
  selectTemperature,
  selectStreamingEnabled,
  selectSelectedModel,
  selectGuardrailsEnabled,
} from '~/app/Chatbot/store';
import { UseSourceManagementReturn } from '~/app/Chatbot/hooks/useSourceManagement';
import { UseFileManagementReturn } from '~/app/Chatbot/hooks/useFileManagement';
import { MCPServerFromAPI, TokenInfo } from '~/app/types';
import { ServerStatusInfo } from '~/app/hooks/useMCPServerStatuses';
import {
  ModelTabContent,
  PromptTabContent,
  KnowledgeTabContent,
  MCPTabContent,
  GuardrailsTabContent,
} from './settingsPanelTabs';

interface ChatbotSettingsPanelProps {
  configId?: string;
  alerts: {
    uploadSuccessAlert: React.ReactElement | undefined;
    deleteSuccessAlert: React.ReactElement | undefined;
    errorAlert: React.ReactElement | undefined;
  };
  sourceManagement: UseSourceManagementReturn;
  fileManagement: UseFileManagementReturn;
  onMcpServersChange?: (serverIds: string[]) => void;
  initialSelectedServerIds?: string[];
  initialServerStatuses?: Map<string, ServerStatusInfo>;
  selectedServersCount: number;
  mcpServers: MCPServerFromAPI[];
  mcpServersLoaded: boolean;
  mcpServersLoadError?: Error | null;
  mcpServerTokens: Map<string, TokenInfo>;
  onMcpServerTokensChange: (tokens: Map<string, TokenInfo>) => void;
  checkMcpServerStatus: (serverUrl: string, mcpBearerToken?: string) => Promise<ServerStatusInfo>;
}

const SETTINGS_PANEL_WIDTH = 'chatbot-settings-panel-width';
const DEFAULT_WIDTH = '550px';

const ChatbotSettingsPanel: React.FunctionComponent<ChatbotSettingsPanelProps> = ({
  configId = 'default',
  alerts,
  sourceManagement,
  fileManagement,
  onMcpServersChange,
  initialSelectedServerIds,
  initialServerStatuses,
  selectedServersCount,
  mcpServers,
  mcpServersLoaded,
  mcpServersLoadError,
  mcpServerTokens,
  onMcpServerTokensChange,
  checkMcpServerStatus,
}) => {
  const [showMcpToolsWarning, setShowMcpToolsWarning] = React.useState(false);
  const [activeToolsCount, setActiveToolsCount] = React.useState(0);

  // Consume store directly using configId
  const systemInstruction = useChatbotConfigStore(selectSystemInstruction(configId));
  const temperature = useChatbotConfigStore(selectTemperature(configId));
  const isStreamingEnabled = useChatbotConfigStore(selectStreamingEnabled(configId));
  const selectedModel = useChatbotConfigStore(selectSelectedModel(configId));
  const guardrailsEnabled = useChatbotConfigStore(selectGuardrailsEnabled(configId));

  // Get updater functions from store
  const updateSystemInstruction = useChatbotConfigStore((state) => state.updateSystemInstruction);
  const updateTemperature = useChatbotConfigStore((state) => state.updateTemperature);
  const updateStreamingEnabled = useChatbotConfigStore((state) => state.updateStreamingEnabled);
  const updateSelectedModel = useChatbotConfigStore((state) => state.updateSelectedModel);
  const updateGuardrailsEnabled = useChatbotConfigStore((state) => state.updateGuardrailsEnabled);

  // Create callback handlers that include configId
  const handleSystemInstructionChange = React.useCallback(
    (value: string) => {
      updateSystemInstruction(configId, value);
    },
    [configId, updateSystemInstruction],
  );

  const handleTemperatureChange = React.useCallback(
    (value: number) => {
      updateTemperature(configId, value);
    },
    [configId, updateTemperature],
  );

  const handleModelChange = React.useCallback(
    (value: string) => {
      updateSelectedModel(configId, value);
    },
    [configId, updateSelectedModel],
  );

  const handleStreamingToggle = React.useCallback(
    (enabled: boolean) => {
      updateStreamingEnabled(configId, enabled);
    },
    [configId, updateStreamingEnabled],
  );

  const handleGuardrailsToggle = React.useCallback(
    (enabled: boolean) => {
      updateGuardrailsEnabled(configId, enabled);
    },
    [configId, updateGuardrailsEnabled],
  );

  // Panel width state with session storage persistence
  const [panelWidth, setPanelWidth] = React.useState<string>(() => {
    const storedWidth = sessionStorage.getItem(SETTINGS_PANEL_WIDTH);
    return storedWidth || DEFAULT_WIDTH;
  });

  const handlePanelResize = (
    _event: MouseEvent | TouchEvent | React.KeyboardEvent<Element>,
    width: number,
  ) => {
    const newWidth = `${width}px`;
    setPanelWidth(newWidth);
    sessionStorage.setItem(SETTINGS_PANEL_WIDTH, newWidth);
  };

  // Tab state
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(0);
  const handleTabClick = (
    _event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
    tabIndex: string | number,
  ) => {
    setActiveTabKey(tabIndex);
  };

  return (
    <DrawerPanelContent
      isResizable
      defaultSize={panelWidth}
      minSize="300px"
      onResize={handlePanelResize}
    >
      <DrawerPanelBody>
        <Tabs
          activeKey={activeTabKey}
          onSelect={handleTabClick}
          aria-label="Chatbot settings page tabs"
          role="region"
          data-testid="chatbot-settings-page-tabs"
        >
          <Tab
            eventKey={0}
            title={<TabTitleText>Model</TabTitleText>}
            data-testid="chatbot-settings-page-tab-model"
          >
            <ModelTabContent
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
              temperature={temperature}
              onTemperatureChange={handleTemperatureChange}
              isStreamingEnabled={isStreamingEnabled}
              onStreamingToggle={handleStreamingToggle}
            />
          </Tab>

          <Tab
            eventKey={1}
            title={<TabTitleText>Prompt</TabTitleText>}
            data-testid="chatbot-settings-page-tab-prompt"
          >
            <PromptTabContent
              systemInstruction={systemInstruction}
              onSystemInstructionChange={handleSystemInstructionChange}
            />
          </Tab>

          <Tab
            eventKey={2}
            title={
              <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                <FlexItem>
                  <TabTitleText>Knowledge</TabTitleText>
                </FlexItem>
                <FlexItem>
                  <Badge
                    isRead={!sourceManagement.isRawUploaded}
                    data-testid="knowledge-status-badge"
                  >
                    {sourceManagement.isRawUploaded ? 'On' : 'Off'}
                  </Badge>
                </FlexItem>
              </Flex>
            }
            data-testid="chatbot-settings-page-tab-knowledge"
          >
            <KnowledgeTabContent
              sourceManagement={sourceManagement}
              fileManagement={fileManagement}
              alerts={alerts}
            />
          </Tab>

          <Tab
            eventKey={3}
            title={
              <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                <FlexItem>
                  <TabTitleText>MCP</TabTitleText>
                </FlexItem>
                {selectedServersCount > 0 && (
                  <FlexItem>
                    <Badge>{selectedServersCount}</Badge>
                  </FlexItem>
                )}
                {showMcpToolsWarning && (
                  <FlexItem>
                    <Tooltip content="Performance may be degraded with more than 40 active tools">
                      <Icon status="warning" data-testid="mcp-tools-warning-icon">
                        <ExclamationTriangleIcon />
                      </Icon>
                    </Tooltip>
                  </FlexItem>
                )}
              </Flex>
            }
            data-testid="chatbot-settings-page-tab-mcp"
          >
            <MCPTabContent
              mcpServers={mcpServers}
              mcpServersLoaded={mcpServersLoaded}
              mcpServersLoadError={mcpServersLoadError}
              mcpServerTokens={mcpServerTokens}
              onMcpServerTokensChange={onMcpServerTokensChange}
              checkMcpServerStatus={checkMcpServerStatus}
              onMcpServersChange={onMcpServersChange}
              initialSelectedServerIds={initialSelectedServerIds}
              initialServerStatuses={initialServerStatuses}
              activeToolsCount={activeToolsCount}
              onActiveToolsCountChange={setActiveToolsCount}
              onToolsWarningChange={setShowMcpToolsWarning}
            />
          </Tab>

          <Tab
            eventKey={4}
            title={
              <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                <FlexItem>
                  <TabTitleText>Guardrails</TabTitleText>
                </FlexItem>
                <FlexItem>
                  <Badge isRead={!guardrailsEnabled} data-testid="guardrails-status-badge">
                    {guardrailsEnabled ? 'On' : 'Off'}
                  </Badge>
                </FlexItem>
              </Flex>
            }
            data-testid="chatbot-settings-page-tab-guardrails"
          >
            <GuardrailsTabContent
              guardrailsEnabled={guardrailsEnabled}
              onGuardrailsToggle={handleGuardrailsToggle}
            />
          </Tab>
        </Tabs>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export { ChatbotSettingsPanel };

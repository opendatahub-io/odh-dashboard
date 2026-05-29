import * as React from 'react';
import {
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelContent,
  DrawerPanelBody,
  Badge,
  Flex,
  FlexItem,
  Icon,
  Tabs,
  Tab,
  TabTitleText,
  Title,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import {
  useChatbotConfigStore,
  selectSystemInstruction,
  selectTemperature,
  selectStreamingEnabled,
  selectSelectedMcpServerIds,
  selectSelectedModel,
  selectSelectedSubscription,
  selectRagEnabled,
  selectConfigIds,
  DEFAULT_CONFIG_ID,
} from '~/app/Chatbot/store';
import { UseSourceManagementReturn } from '~/app/Chatbot/hooks/useSourceManagement';
import { UseFileManagementReturn } from '~/app/Chatbot/hooks/useFileManagement';
import useGuardrailsEnabled from '~/app/Chatbot/hooks/useGuardrailsEnabled';
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
  initialServerStatuses?: Map<string, ServerStatusInfo>;
  mcpServers: MCPServerFromAPI[];
  mcpServersLoaded: boolean;
  mcpServersLoadError?: Error | null;
  mcpServerTokens: Map<string, TokenInfo>;
  onMcpServerTokensChange: (tokens: Map<string, TokenInfo>) => void;
  checkMcpServerStatus: (serverUrl: string, mcpBearerToken?: string) => Promise<ServerStatusInfo>;
  // Guardrails props
  onCloseClick?: () => void;
  onActiveConfigChange?: (configId: string) => void;
  /** Whether the drawer is in overlay mode (compare mode) - affects background styling */
  isOverlay?: boolean;
  defaultActiveTabKey?: string | number;
}

const SETTINGS_PANEL_WIDTH = 'chatbot-settings-panel-width';
const DEFAULT_WIDTH = '550px';
const AUTO_CLOSE_WIDTH_THRESHOLD = 150;

const ChatbotSettingsPanel: React.FunctionComponent<ChatbotSettingsPanelProps> = ({
  configId = DEFAULT_CONFIG_ID,
  alerts,
  sourceManagement,
  fileManagement,
  initialServerStatuses,
  mcpServers,
  mcpServersLoaded,
  mcpServersLoadError,
  mcpServerTokens,
  onMcpServerTokensChange,
  checkMcpServerStatus,
  onCloseClick,
  onActiveConfigChange,
  isOverlay = false,
  defaultActiveTabKey,
}) => {
  const [showMcpToolsWarning, setShowMcpToolsWarning] = React.useState(false);
  const [activeToolsCount, setActiveToolsCount] = React.useState(0);
  const isGuardrailsFeatureEnabled = useGuardrailsEnabled();

  const configIds = useChatbotConfigStore(selectConfigIds);

  // Consume store directly using configId (controlled by parent)
  const systemInstruction = useChatbotConfigStore(selectSystemInstruction(configId));
  const temperature = useChatbotConfigStore(selectTemperature(configId));
  const selectedMcpServerIds = useChatbotConfigStore(selectSelectedMcpServerIds(configId));
  const isStreamingEnabled = useChatbotConfigStore(selectStreamingEnabled(configId));
  const selectedModel = useChatbotConfigStore(selectSelectedModel(configId));
  const selectedSubscription = useChatbotConfigStore(selectSelectedSubscription(configId));
  const isRagEnabled = useChatbotConfigStore(selectRagEnabled(configId));

  // Get updater functions from store
  const updateSystemInstruction = useChatbotConfigStore((state) => state.updateSystemInstruction);
  const updateTemperature = useChatbotConfigStore((state) => state.updateTemperature);
  const updateStreamingEnabled = useChatbotConfigStore((state) => state.updateStreamingEnabled);
  const updateSelectedModel = useChatbotConfigStore((state) => state.updateSelectedModel);
  const updateSelectedSubscription = useChatbotConfigStore(
    (state) => state.updateSelectedSubscription,
  );

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

  const handleStreamingToggle = React.useCallback(
    (enabled: boolean) => {
      updateStreamingEnabled(configId, enabled);
    },
    [configId, updateStreamingEnabled],
  );

  const handleModelChange = React.useCallback(
    (model: string) => {
      updateSelectedModel(configId, model);
    },
    [configId, updateSelectedModel],
  );

  const handleSubscriptionChange = React.useCallback(
    (subscription: string) => {
      updateSelectedSubscription(configId, subscription);
    },
    [configId, updateSelectedSubscription],
  );

  // Panel width state with session storage persistence
  const [panelWidth, setPanelWidth] = React.useState<string>(() => {
    const storedWidth = sessionStorage.getItem(SETTINGS_PANEL_WIDTH);
    return storedWidth || DEFAULT_WIDTH;
  });

  // Key to force DrawerPanelContent remount when auto-closing, so it resets to defaultSize
  const [panelSizeKey, setPanelSizeKey] = React.useState(0);

  // Key to force Tabs remount when panel width changes so overflow arrows recalculate.
  // This is safe because:
  // 1. All tab content state is stored in useChatbotConfigStore (controlled components)
  // 2. No async operations in tab content that would be canceled
  // 3. Remount is debounced (300ms after resize ends) to avoid performance issues
  // 4. PatternFly Tabs doesn't auto-recalculate overflow on container resize
  const [tabsKey, setTabsKey] = React.useState(0);

  // Debounce timeout for Tabs remount
  const resizeEndTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handlePanelResize = (
    _event: MouseEvent | TouchEvent | React.KeyboardEvent<Element>,
    width: number,
  ) => {
    if (width < AUTO_CLOSE_WIDTH_THRESHOLD) {
      setPanelWidth(DEFAULT_WIDTH);
      sessionStorage.setItem(SETTINGS_PANEL_WIDTH, DEFAULT_WIDTH);
      setPanelSizeKey((k) => k + 1);
      onCloseClick?.();
      return;
    }
    const newWidth = `${width}px`;
    setPanelWidth(newWidth);
    sessionStorage.setItem(SETTINGS_PANEL_WIDTH, newWidth);

    // Debounce Tabs remount: only remount after resize ends (300ms after last resize event)
    if (resizeEndTimeoutRef.current) {
      clearTimeout(resizeEndTimeoutRef.current);
    }
    resizeEndTimeoutRef.current = setTimeout(() => {
      setTabsKey((k) => k + 1);
    }, 300);
  };

  // Cleanup resize debounce timeout on unmount
  React.useEffect(
    () => () => {
      if (resizeEndTimeoutRef.current) {
        clearTimeout(resizeEndTimeoutRef.current);
      }
    },
    [],
  );

  // Tab state
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(defaultActiveTabKey ?? 0);
  const handleTabClick = (
    _event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
    tabIndex: string | number,
  ) => {
    setActiveTabKey(tabIndex);
  };

  // Overlay drawer (compare mode) needs explicit background color
  const panelStyle: React.CSSProperties | undefined = isOverlay
    ? {
        backgroundColor: 'var(--pf-t--global--background--color--primary--default)',
      }
    : undefined;

  return (
    <DrawerPanelContent
      key={panelSizeKey}
      isResizable
      defaultSize={panelWidth}
      minSize="300px"
      onResize={handlePanelResize}
      style={panelStyle}
    >
      <DrawerHead>
        {configIds.length === 1 ? (
          <Title headingLevel="h2" data-testid="chatbot-settings-panel-header">
            Configure
          </Title>
        ) : (
          <ToggleGroup
            aria-label="Chat configuration selector"
            data-testid="chatbot-config-switcher"
          >
            {configIds.map((id, index) => (
              <ToggleGroupItem
                key={id}
                text={`Chat ${index + 1}`}
                isSelected={id === configId}
                onChange={() => onActiveConfigChange?.(id)}
                data-testid={`chatbot-config-tab-${index + 1}`}
              />
            ))}
          </ToggleGroup>
        )}
        <DrawerActions>
          <DrawerCloseButton onClick={() => onCloseClick?.()} aria-label="Close settings panel" />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <Tabs
          key={tabsKey}
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
              temperature={temperature}
              onTemperatureChange={handleTemperatureChange}
              isStreamingEnabled={isStreamingEnabled}
              onStreamingToggle={handleStreamingToggle}
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
              selectedSubscription={selectedSubscription}
              onSubscriptionChange={handleSubscriptionChange}
            />
          </Tab>

          <Tab
            eventKey={1}
            title={<TabTitleText>Prompt</TabTitleText>}
            data-testid="chatbot-settings-page-tab-prompt"
          >
            <PromptTabContent
              configId={configId}
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
                  <Badge isRead={!isRagEnabled} data-testid="knowledge-status-badge">
                    {isRagEnabled ? 'On' : 'Off'}
                  </Badge>
                </FlexItem>
              </Flex>
            }
            data-testid="chatbot-settings-page-tab-knowledge"
          >
            <KnowledgeTabContent
              configId={configId}
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
                {selectedMcpServerIds.length > 0 && (
                  <FlexItem>
                    <Badge>{selectedMcpServerIds.length}</Badge>
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
              configId={configId}
              mcpServers={mcpServers}
              mcpServersLoaded={mcpServersLoaded}
              mcpServersLoadError={mcpServersLoadError}
              mcpServerTokens={mcpServerTokens}
              onMcpServerTokensChange={onMcpServerTokensChange}
              checkMcpServerStatus={checkMcpServerStatus}
              initialServerStatuses={initialServerStatuses}
              activeToolsCount={activeToolsCount}
              onActiveToolsCountChange={setActiveToolsCount}
              onToolsWarningChange={setShowMcpToolsWarning}
            />
          </Tab>

          {isGuardrailsFeatureEnabled ? (
            <Tab
              eventKey={4}
              title={<TabTitleText>Guardrails</TabTitleText>}
              data-testid="chatbot-settings-page-tab-guardrails"
            >
              <GuardrailsTabContent configId={configId} />
            </Tab>
          ) : null}
        </Tabs>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export { ChatbotSettingsPanel };

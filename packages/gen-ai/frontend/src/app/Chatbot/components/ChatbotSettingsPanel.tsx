import * as React from 'react';
import {
  Button,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelContent,
  DrawerPanelBody,
  Badge,
  Flex,
  FlexItem,
  Icon,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Popover,
  Title,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import useIsProfileDirty from '~/app/agentProfile/useIsProfileDirty';
import RhUiUploadIcon from '~/app/images/icons/RhUiUploadIcon';
import { AGENT_CONFIG_MANAGEMENT } from '~/odh/extensions';
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
import { PLAYGROUND_AGENT_EVENTS } from '~/app/tracking/playgroundAgentTrackingConstants';
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
  onLoad?: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  onResetToLastSaved?: () => void;
  /** Whether the drawer is in overlay mode (compare mode) - affects background styling */
  isOverlay?: boolean;
  defaultActiveTabKey?: string | number;
  /** Controlled active tab key — when provided, overrides internal state */
  activeTabKey?: string | number;
  onActiveTabKeyChange?: (key: string | number) => void;
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
  activeTabKey: activeTabKeyProp,
  onActiveTabKeyChange,
  onLoad,
  onSave,
  onSaveAs,
  onResetToLastSaved,
}) => {
  const [showMcpToolsWarning, setShowMcpToolsWarning] = React.useState(false);
  const [activeToolsCount, setActiveToolsCount] = React.useState(0);
  const [showResetModal, setShowResetModal] = React.useState(false);
  const isProfileDirty = useIsProfileDirty(configId);

  const isGuardrailsFeatureEnabled = useGuardrailsEnabled();
  const [agentConfigManagementEnabled] = useFeatureFlag(AGENT_CONFIG_MANAGEMENT);
  const profileApplied = useChatbotConfigStore((s) => s.profileApplied);
  const loadedProfileId = useChatbotConfigStore((s) => s.loadedProfileId);
  const loadedProfileWarnings = useChatbotConfigStore((s) => s.loadedProfileWarnings);
  const hasWarnings = !!loadedProfileWarnings?.length;

  const configIds = useChatbotConfigStore(selectConfigIds);
  const isCompareMode = configIds.length > 1;

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
  };

  // Tab state — controlled when activeTabKeyProp is provided, otherwise internal
  const [activeTabKeyInternal, setActiveTabKeyInternal] = React.useState<string | number>(
    defaultActiveTabKey ?? 0,
  );
  const activeTabKey = activeTabKeyProp ?? activeTabKeyInternal;
  const handleTabSelect = (tabIndex: string | number) => {
    // Only update internal state when uncontrolled so it doesn't diverge from the prop
    if (activeTabKeyProp === undefined) {
      setActiveTabKeyInternal(tabIndex);
    }
    onActiveTabKeyChange?.(tabIndex);
  };

  // Overlay drawer (compare mode) needs explicit background color
  const panelStyle: React.CSSProperties | undefined = isOverlay
    ? {
        backgroundColor: 'var(--pf-t--global--background--color--primary--default)',
        overflow: 'hidden',
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
          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
            <FlexItem>
              <Title headingLevel="h4" size="md" data-testid="chatbot-settings-panel-header">
                Settings
              </Title>
            </FlexItem>
            {agentConfigManagementEnabled && (
              <FlexItem>
                <Popover
                  headerContent="Settings"
                  bodyContent="Changes apply to this chat as you make them. Save an agent to keep your configuration."
                >
                  <Button
                    variant="plain"
                    aria-label="Settings information"
                    icon={<OutlinedQuestionCircleIcon />}
                    data-testid="settings-info-button"
                  />
                </Popover>
              </FlexItem>
            )}
          </Flex>
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
        <DrawerActions style={{ gap: 'var(--pf-t--global--spacer--sm)' }}>
          {agentConfigManagementEnabled && !isCompareMode && (
            <Button
              variant="secondary"
              icon={<RhUiUploadIcon />}
              onClick={onLoad}
              data-testid="settings-panel-load-button"
            >
              Load agent
            </Button>
          )}
          <DrawerCloseButton onClick={() => onCloseClick?.()} aria-label="Close settings panel" />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody
        style={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        hasNoPadding
      >
        <ToggleGroup
          isFill
          aria-label="Chatbot settings page tabs"
          data-testid="chatbot-settings-page-tabs"
        >
          <ToggleGroupItem
            text="Model"
            isSelected={activeTabKey === 0}
            onChange={() => handleTabSelect(0)}
            data-testid="chatbot-settings-page-tab-model"
          />
          <ToggleGroupItem
            text="Prompt"
            isSelected={activeTabKey === 1}
            onChange={() => handleTabSelect(1)}
            data-testid="chatbot-settings-page-tab-prompt"
          />
          <ToggleGroupItem
            text={
              <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                <FlexItem>Knowledge</FlexItem>
                <FlexItem>
                  <Badge isRead={!isRagEnabled} data-testid="knowledge-status-badge">
                    {isRagEnabled ? 'On' : 'Off'}
                  </Badge>
                </FlexItem>
              </Flex>
            }
            isSelected={activeTabKey === 2}
            onChange={() => handleTabSelect(2)}
            data-testid="chatbot-settings-page-tab-knowledge"
          />
          <ToggleGroupItem
            text={
              <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                <FlexItem>MCP</FlexItem>
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
            isSelected={activeTabKey === 3}
            onChange={() => handleTabSelect(3)}
            data-testid="chatbot-settings-page-tab-mcp"
          />
          {isGuardrailsFeatureEnabled && (
            <ToggleGroupItem
              text="Guardrails"
              isSelected={activeTabKey === 4}
              onChange={() => handleTabSelect(4)}
              data-testid="chatbot-settings-page-tab-guardrails"
            />
          )}
        </ToggleGroup>

        {/* Keep all tab content mounted to preserve lifecycle state (data fetches, etc.)
           and toggle visibility with PF utility class, matching old Tabs show/hide behaviour */}
        <div className={activeTabKey !== 0 ? 'pf-v6-u-display-none' : undefined}>
          <ModelTabContent
            configId={configId}
            temperature={temperature}
            onTemperatureChange={handleTemperatureChange}
            isStreamingEnabled={isStreamingEnabled}
            onStreamingToggle={handleStreamingToggle}
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            selectedSubscription={selectedSubscription}
            onSubscriptionChange={handleSubscriptionChange}
          />
        </div>
        <div className={activeTabKey !== 1 ? 'pf-v6-u-display-none' : undefined}>
          <PromptTabContent
            configId={configId}
            systemInstruction={systemInstruction}
            onSystemInstructionChange={handleSystemInstructionChange}
          />
        </div>
        <div className={activeTabKey !== 2 ? 'pf-v6-u-display-none' : undefined}>
          <KnowledgeTabContent
            configId={configId}
            sourceManagement={sourceManagement}
            fileManagement={fileManagement}
            alerts={alerts}
          />
        </div>
        <div className={activeTabKey !== 3 ? 'pf-v6-u-display-none' : undefined}>
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
        </div>
        {isGuardrailsFeatureEnabled && (
          <div className={activeTabKey !== 4 ? 'pf-v6-u-display-none' : undefined}>
            <GuardrailsTabContent configId={configId} />
          </div>
        )}
      </DrawerPanelBody>
      {agentConfigManagementEnabled && !isCompareMode && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--pf-t--global--spacer--sm)',
            padding: 'var(--pf-t--global--spacer--md)',
            borderTop: '1px solid var(--pf-t--global--border--color--default)',
          }}
        >
          {profileApplied &&
            (hasWarnings ? (
              <Tooltip
                content="You don't have permission to access every model, vector store, or prompt in this agent."
                trigger="mouseenter focus"
              >
                <Button variant="primary" isAriaDisabled data-testid="settings-panel-save-button">
                  Save
                </Button>
              </Tooltip>
            ) : (
              <Button variant="primary" onClick={onSave} data-testid="settings-panel-save-button">
                Save
              </Button>
            ))}
          <Button
            variant={profileApplied ? 'secondary' : 'primary'}
            onClick={() => {
              fireMiscTrackingEvent(PLAYGROUND_AGENT_EVENTS.SAVE_COPY_SELECTED, {
                agentID: loadedProfileId ?? '',
                triggerContext: 'settings_drawer_button',
              });
              onSaveAs?.();
            }}
            data-testid="settings-panel-save-as-button"
          >
            Save as new agent
          </Button>
          {profileApplied && onResetToLastSaved && (
            <Button
              variant="link"
              isDanger
              isDisabled={!isProfileDirty}
              onClick={() => setShowResetModal(true)}
              data-testid="settings-panel-reset-button"
            >
              Revert
            </Button>
          )}
        </div>
      )}

      {showResetModal && (
        <Modal
          variant="small"
          isOpen
          onClose={() => setShowResetModal(false)}
          aria-labelledby="reset-agent-modal-title"
          data-testid="reset-agent-modal"
        >
          <ModalHeader
            title="Revert to last saved agent?"
            labelId="reset-agent-modal-title"
            titleIconVariant="warning"
          />
          <ModalBody>Your settings will return to the last saved version of this agent.</ModalBody>
          <ModalFooter>
            <Button
              variant="primary"
              onClick={() => {
                onResetToLastSaved?.();
                setShowResetModal(false);
              }}
              data-testid="reset-agent-confirm-button"
            >
              Revert
            </Button>
            <Button variant="link" onClick={() => setShowResetModal(false)}>
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </DrawerPanelContent>
  );
};

export { ChatbotSettingsPanel };

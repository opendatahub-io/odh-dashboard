import * as React from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionContent,
  AccordionToggle,
  DrawerPanelContent,
  DrawerPanelBody,
  Form,
  FormGroup,
  Title,
  Switch,
  Label,
  AlertGroup,
  Flex,
  FlexItem,
  Icon,
  Tabs,
  Tab,
  Tooltip,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { ChatbotSourceUploadPanel } from '~/app/Chatbot/sourceUpload/ChatbotSourceUploadPanel';
import { ACCORDION_ITEMS } from '~/app/Chatbot/const';
import useAccordionState from '~/app/Chatbot/hooks/useAccordionState';
import {
  useChatbotConfigStore,
  selectSystemInstruction,
  selectTemperature,
  selectStreamingEnabled,
  selectSelectedModel,
} from '~/app/Chatbot/store';
import { UseSourceManagementReturn } from '~/app/Chatbot/hooks/useSourceManagement';
import { UseFileManagementReturn } from '~/app/Chatbot/hooks/useFileManagement';
import useDarkMode from '~/app/Chatbot/hooks/useDarkMode';
import { MCPServerFromAPI, TokenInfo } from '~/app/types';
import { ServerStatusInfo } from '~/app/hooks/useMCPServerStatuses';
import MCPServersPanel from '~/app/Chatbot/mcp/MCPServersPanel';
import UploadedFilesList from './UploadedFilesList';
import ModelDetailsDropdown from './ModelDetailsDropdown';
import SystemPromptFormGroup from './SystemInstructionFormGroup';
import ModelParameterFormGroup from './ModelParameterFormGroup';

interface ChatbotSettingsPanelProps {
  configId?: string; // Defaults to 'default' for single-window mode
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
  // MCP data props
  mcpServers: MCPServerFromAPI[];
  mcpServersLoaded: boolean;
  mcpServersLoadError?: Error | null;
  mcpServerTokens: Map<string, TokenInfo>;
  onMcpServerTokensChange: (tokens: Map<string, TokenInfo>) => void;
  checkMcpServerStatus: (serverUrl: string, mcpBearerToken?: string) => Promise<ServerStatusInfo>;
}

const ChatbotSettingsPanel: React.FunctionComponent<ChatbotSettingsPanelProps> = ({
  configId = 'default', // Default to 'default' for single-window mode
  alerts,
  sourceManagement,
  fileManagement,
  onMcpServersChange,
  initialSelectedServerIds,
  initialServerStatuses,
  selectedServersCount,
  // MCP data props
  mcpServers,
  mcpServersLoaded,
  mcpServersLoadError,
  mcpServerTokens,
  onMcpServerTokensChange,
  checkMcpServerStatus,
}) => {
  const accordionState = useAccordionState();
  const isDarkMode = useDarkMode();
  const [showMcpToolsWarning, setShowMcpToolsWarning] = React.useState(false);

  // Consume store directly using configId
  const systemInstruction = useChatbotConfigStore(selectSystemInstruction(configId));
  const temperature = useChatbotConfigStore(selectTemperature(configId));
  const isStreamingEnabled = useChatbotConfigStore(selectStreamingEnabled(configId));
  const selectedModel = useChatbotConfigStore(selectSelectedModel(configId));

  // Get updater functions from store
  const updateSystemInstruction = useChatbotConfigStore((state) => state.updateSystemInstruction);
  const updateTemperature = useChatbotConfigStore((state) => state.updateTemperature);
  const updateStreamingEnabled = useChatbotConfigStore((state) => state.updateStreamingEnabled);
  const updateSelectedModel = useChatbotConfigStore((state) => state.updateSelectedModel);

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

  const SETTINGS_PANEL_WIDTH = 'chatbot-settings-panel-width';
  const DEFAULT_WIDTH = '460px';

  // Initialize panel width from session storage or use default
  const [panelWidth, setPanelWidth] = React.useState<string>(() => {
    const storedWidth = sessionStorage.getItem(SETTINGS_PANEL_WIDTH);
    return storedWidth || DEFAULT_WIDTH;
  });

  // Handle panel resize and save to session storage
  const handlePanelResize = (
    _event: MouseEvent | TouchEvent | React.KeyboardEvent<Element>,
    width: number,
  ) => {
    const newWidth = `${width}px`;
    setPanelWidth(newWidth);
    sessionStorage.setItem(SETTINGS_PANEL_WIDTH, newWidth);
  };

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
        >
          <Tab eventKey={0} title="Model">
            Model details content here
          </Tab>
          <Tab eventKey={1} title="Prompt">
            Prompt content here
          </Tab>
          <Tab eventKey={2} title="Knowledge">
            Knowledge content here
          </Tab>
          <Tab eventKey={3} title="MCP">
            MCP content here
          </Tab>
          <Tab eventKey={4} title="Guardrails">
            Guardrails content here
          </Tab>
        </Tabs>
        <Accordion asDefinitionList={false}>
          {/* Model Details Accordion Item */}
          <AccordionItem
            isExpanded={accordionState.expandedAccordionItems.includes(
              ACCORDION_ITEMS.MODEL_DETAILS,
            )}
          >
            <AccordionToggle
              onClick={() => accordionState.onAccordionToggle(ACCORDION_ITEMS.MODEL_DETAILS)}
              id={ACCORDION_ITEMS.MODEL_DETAILS}
              style={{
                backgroundColor: isDarkMode
                  ? 'var(--pf-v6-c-page__main-section--BackgroundColor)'
                  : 'var(--pf-t--global--background--color--100)',
              }}
            >
              <Title headingLevel="h2" size="lg">
                Model details
              </Title>
            </AccordionToggle>
            <AccordionContent
              id="model-details-content"
              style={{
                backgroundColor: isDarkMode
                  ? 'var(--pf-v6-c-page__main-section--BackgroundColor)'
                  : 'var(--pf-t--global--background--color--100)',
                margin: '0',
                padding: '0.5rem',
              }}
            >
              <Form>
                <FormGroup label="Model" fieldId="model-details">
                  <ModelDetailsDropdown
                    selectedModel={selectedModel}
                    onModelChange={handleModelChange}
                  />
                </FormGroup>
                <FormGroup
                  label="System instructions"
                  fieldId="system-instructions"
                  data-testid="system-instructions-section"
                >
                  <SystemPromptFormGroup
                    systemInstruction={systemInstruction}
                    onSystemInstructionChange={handleSystemInstructionChange}
                  />
                </FormGroup>

                {/* Model Parameters */}
                <ModelParameterFormGroup
                  fieldId="temperature"
                  label="Temperature"
                  helpText="This controls the randomness of the model's output."
                  value={temperature}
                  onChange={(value) => {
                    handleTemperatureChange(value);
                    fireMiscTrackingEvent('Playground Model Parameter Changed', {
                      parameter: 'temperature',
                      value,
                    });
                  }}
                  max={2}
                />
                <FormGroup fieldId="streaming">
                  <Switch
                    id="streaming-switch"
                    label="Streaming"
                    isChecked={isStreamingEnabled}
                    onChange={(_event, checked) => handleStreamingToggle(checked)}
                    aria-label="Toggle streaming responses"
                  />
                </FormGroup>
              </Form>
            </AccordionContent>
          </AccordionItem>
          {/* RAG Accordion Item */}
          <AccordionItem
            isExpanded={accordionState.expandedAccordionItems.includes(ACCORDION_ITEMS.SOURCES)}
          >
            <AccordionToggle
              onClick={() => accordionState.onAccordionToggle(ACCORDION_ITEMS.SOURCES)}
              id={ACCORDION_ITEMS.SOURCES}
              style={{
                backgroundColor: isDarkMode
                  ? 'var(--pf-v6-c-page__main-section--BackgroundColor)'
                  : 'var(--pf-t--global--background--color--100)',
              }}
            >
              <Flex
                justifyContent={{ default: 'justifyContentSpaceBetween' }}
                alignItems={{ default: 'alignItemsCenter' }}
                style={{
                  width: '100%',
                }}
              >
                <FlexItem>
                  <Title headingLevel="h2" size="lg" data-testid="rag-section-title">
                    RAG
                  </Title>
                </FlexItem>
                <FlexItem>
                  {/* Use div to prevent the click event from bubbling up to the accordion toggle */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        e.preventDefault();
                        sourceManagement.setIsRawUploaded(!sourceManagement.isRawUploaded);
                      }
                    }}
                    role="presentation"
                  >
                    <Switch
                      id="no-label-switch-on"
                      aria-label="Toggle uploaded mode"
                      isChecked={sourceManagement.isRawUploaded}
                      data-testid="rag-toggle-switch"
                      onChange={(_, checked) => {
                        sourceManagement.setIsRawUploaded(checked);
                        fireMiscTrackingEvent('Playground RAG Toggle Selected', {
                          isRag: checked,
                        });
                      }}
                    />
                  </div>
                </FlexItem>
              </Flex>
            </AccordionToggle>
            <AccordionContent
              id="sources-content"
              style={{
                backgroundColor: isDarkMode
                  ? 'var(--pf-v6-c-page__main-section--BackgroundColor)'
                  : 'var(--pf-t--global--background--color--100)',
                margin: '0',
                padding: '0.5rem',
              }}
            >
              <Form>
                <FormGroup fieldId="sources">
                  <ChatbotSourceUploadPanel
                    successAlert={alerts.uploadSuccessAlert}
                    errorAlert={alerts.errorAlert}
                    handleSourceDrop={sourceManagement.handleSourceDrop}
                    removeUploadedSource={sourceManagement.removeUploadedSource}
                    filesWithSettings={sourceManagement.filesWithSettings}
                    uploadedFilesCount={fileManagement.files.length}
                    maxFilesAllowed={10}
                    isFilesLoading={fileManagement.isLoading}
                  />
                </FormGroup>
                <FormGroup fieldId="uploaded-files" className="pf-v6-u-mt-md">
                  <AlertGroup hasAnimations isToast isLiveRegion>
                    {alerts.deleteSuccessAlert}
                  </AlertGroup>
                  <UploadedFilesList
                    files={fileManagement.files}
                    isLoading={fileManagement.isLoading}
                    isDeleting={fileManagement.isDeleting}
                    error={fileManagement.error}
                    onDeleteFile={fileManagement.deleteFileById}
                  />
                </FormGroup>
              </Form>
            </AccordionContent>
          </AccordionItem>
          {/* MCP Servers Accordion Item */}
          <AccordionItem
            isExpanded={accordionState.expandedAccordionItems.includes(ACCORDION_ITEMS.MCP_SERVERS)}
          >
            <AccordionToggle
              onClick={() => accordionState.onAccordionToggle(ACCORDION_ITEMS.MCP_SERVERS)}
              id={ACCORDION_ITEMS.MCP_SERVERS}
              style={{
                backgroundColor: isDarkMode
                  ? 'var(--pf-v6-c-page__main-section--BackgroundColor)'
                  : 'var(--pf-t--global--background--color--100)',
              }}
            >
              <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                <FlexItem>
                  <Title headingLevel="h2" size="lg" data-testid="mcp-servers-section-title">
                    MCP servers
                  </Title>
                </FlexItem>
                {selectedServersCount > 0 && (
                  <FlexItem>
                    <Label key={1} color="blue">
                      {selectedServersCount}
                    </Label>
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
            </AccordionToggle>
            <AccordionContent
              id="mcp-servers-content"
              style={{
                backgroundColor: isDarkMode
                  ? 'var(--pf-v6-c-page__main-section--BackgroundColor)'
                  : 'var(--pf-t--global--background--color--100)',
                margin: '0',
              }}
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
                onToolsWarningChange={setShowMcpToolsWarning}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export { ChatbotSettingsPanel };

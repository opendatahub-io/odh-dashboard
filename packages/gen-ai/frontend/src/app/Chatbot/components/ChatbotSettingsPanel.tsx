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
} from '@patternfly/react-core';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { ChatbotSourceUploadPanel } from '~/app/Chatbot/sourceUpload/ChatbotSourceUploadPanel';
import { ACCORDION_ITEMS } from '~/app/Chatbot/const';
import useAccordionState from '~/app/Chatbot/hooks/useAccordionState';
import { UseSourceManagementReturn } from '~/app/Chatbot/hooks/useSourceManagement';
import { UseFileManagementReturn } from '~/app/Chatbot/hooks/useFileManagement';
import useDarkMode from '~/app/Chatbot/hooks/useDarkMode';
import { useMCPSelectionContext } from '~/app/context/MCPSelectionContext';
import MCPServersPanelWithContext from '~/app/Chatbot/mcp/MCPServersPanelWithContext';
import UploadedFilesList from './UploadedFilesList';
import ModelDetailsDropdown from './ModelDetailsDropdown';
import SystemPromptFormGroup from './SystemInstructionFormGroup';
import ModelParameterFormGroup from './ModelParameterFormGroup';

interface ChatbotSettingsPanelProps {
  selectedModel: string;
  onModelChange: (value: string) => void;
  alerts: {
    uploadSuccessAlert: React.ReactElement | undefined;
    deleteSuccessAlert: React.ReactElement | undefined;
    errorAlert: React.ReactElement | undefined;
  };
  sourceManagement: UseSourceManagementReturn;
  fileManagement: UseFileManagementReturn;
  systemInstruction: string;
  onSystemInstructionChange: (value: string) => void;
  isStreamingEnabled: boolean;
  onStreamingToggle: (enabled: boolean) => void;
  temperature: number;
  onTemperatureChange: (value: number) => void;
}

const ChatbotSettingsPanel: React.FunctionComponent<ChatbotSettingsPanelProps> = ({
  selectedModel,
  onModelChange,
  alerts,
  sourceManagement,
  fileManagement,
  systemInstruction,
  onSystemInstructionChange,
  isStreamingEnabled,
  onStreamingToggle,
  temperature,
  onTemperatureChange,
}) => {
  const accordionState = useAccordionState();
  const { selectedServersCount, saveSelectedServersToPlayground } = useMCPSelectionContext();
  const isDarkMode = useDarkMode();

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

  return (
    <DrawerPanelContent
      isResizable
      defaultSize={panelWidth}
      minSize="300px"
      onResize={handlePanelResize}
    >
      <DrawerPanelBody>
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
                    onModelChange={onModelChange}
                  />
                </FormGroup>
                <FormGroup label="System instructions" fieldId="system-instructions">
                  <SystemPromptFormGroup
                    systemInstruction={systemInstruction}
                    onSystemInstructionChange={onSystemInstructionChange}
                  />
                </FormGroup>

                {/* Model Parameters */}
                <ModelParameterFormGroup
                  fieldId="temperature"
                  label="Temperature"
                  helpText="This controls the randomness of the model's output."
                  value={temperature}
                  onChange={(value) => {
                    onTemperatureChange(value);
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
                    onChange={(_event, checked) => onStreamingToggle(checked)}
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
                  <Title headingLevel="h2" size="lg">
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
              <Flex alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem>
                  <Title headingLevel="h2" size="lg">
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
              <MCPServersPanelWithContext onSelectionChange={saveSelectedServersToPlayground} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export { ChatbotSettingsPanel };

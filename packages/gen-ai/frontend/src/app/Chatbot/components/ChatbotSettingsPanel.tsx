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
import { ChatbotSourceUploadPanel } from '~/app/Chatbot/sourceUpload/ChatbotSourceUploadPanel';
import { ACCORDION_ITEMS } from '~/app/Chatbot/const';
import useAccordionState from '~/app/Chatbot/hooks/useAccordionState';
import { UseSourceManagementReturn } from '~/app/Chatbot/hooks/useSourceManagement';
import { UseFileManagementReturn } from '~/app/Chatbot/hooks/useFileManagement';
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
  topP: number;
  onTopPChange: (value: number) => void;
  fileRefreshRef?: React.MutableRefObject<(() => void) | null>;
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
  topP,
  onTopPChange,
  fileRefreshRef,
}) => {
  const accordionState = useAccordionState();
  const { selectedServersCount, saveSelectedServersToPlayground } = useMCPSelectionContext();

  // Assign the refresh function to the ref so it can be called from parent
  React.useEffect(() => {
    if (fileRefreshRef) {
      // eslint-disable-next-line no-param-reassign
      fileRefreshRef.current = fileManagement.refreshFiles;
    }
  }, [fileRefreshRef, fileManagement.refreshFiles]);

  return (
    <DrawerPanelContent isResizable defaultSize="400px" minSize="300px">
      <DrawerPanelBody>
        <Accordion asDefinitionList={false} isBordered>
          {/* Model Details Accordion Item */}
          <AccordionItem
            isExpanded={accordionState.expandedAccordionItems.includes(
              ACCORDION_ITEMS.MODEL_DETAILS,
            )}
          >
            <AccordionToggle
              onClick={() => accordionState.onAccordionToggle(ACCORDION_ITEMS.MODEL_DETAILS)}
              id={ACCORDION_ITEMS.MODEL_DETAILS}
            >
              <Title headingLevel="h2" size="lg">
                Model details
              </Title>
            </AccordionToggle>
            <AccordionContent id="model-details-content">
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
                  onChange={onTemperatureChange}
                />

                <ModelParameterFormGroup
                  fieldId="top-p"
                  label="Top P"
                  helpText="This controls nucleus sampling for more focused responses."
                  value={topP}
                  onChange={onTopPChange}
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
            >
              <Flex
                justifyContent={{ default: 'justifyContentSpaceBetween' }}
                alignItems={{ default: 'alignItemsCenter' }}
                style={{ width: '100%' }}
              >
                <FlexItem>
                  <Title headingLevel="h2" size="lg">
                    RAG
                  </Title>
                </FlexItem>
                <FlexItem>
                  {/* Use FlexItem to prevent the click event from bubbling up to the accordion toggle */}
                  <div
                    role="button"
                    tabIndex={0}
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
                    aria-label="Toggle uploaded mode"
                  >
                    <Switch
                      id="no-label-switch-on"
                      aria-label="Toggle uploaded mode"
                      isChecked={sourceManagement.isRawUploaded}
                      onChange={() =>
                        sourceManagement.setIsRawUploaded(!sourceManagement.isRawUploaded)
                      }
                    />
                  </div>
                </FlexItem>
              </Flex>
            </AccordionToggle>
            <AccordionContent id="sources-content">
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
                    onRefresh={fileManagement.refreshFiles}
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
            >
              <Flex alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem>
                  <Title headingLevel="h2" size="lg">
                    MCP servers
                  </Title>
                </FlexItem>
                {selectedServersCount > 0 && (
                  <FlexItem>
                    <Label key={1} color="blue" className="pf-v6-u-ml-sm">
                      {selectedServersCount}
                    </Label>
                  </FlexItem>
                )}
              </Flex>
            </AccordionToggle>
            <AccordionContent id="mcp-servers-content">
              <MCPServersPanelWithContext onSelectionChange={saveSelectedServersToPlayground} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export { ChatbotSettingsPanel };

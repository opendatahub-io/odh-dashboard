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
  FlexItem,
  Flex,
  Label,
} from '@patternfly/react-core';
import { ChatbotSourceUploadPanel } from '~/app/Chatbot/sourceUpload/ChatbotSourceUploadPanel';
import { ACCORDION_ITEMS } from '~/app/Chatbot/const';
import useAccordionState from '~/app/Chatbot/hooks/useAccordionState';
import { UseSourceManagementReturn } from '~/app/Chatbot/hooks/useSourceManagement';
import { useMCPSelectionContext } from '~/app/context/MCPSelectionContext';
import MCPServersPanelWithContext from '~/app/Chatbot/mcp/MCPServersPanelWithContext';
import ModelDetailsDropdown from './ModelDetailsDropdown';
import SystemPromptFormGroup from './SystemInstructionFormGroup';
import ModelParameterFormGroup from './ModelParameterFormGroup';

interface ChatbotSettingsPanelProps {
  selectedModel: string;
  onModelChange: (value: string) => void;
  alerts: {
    successAlert: React.ReactElement | undefined;
    errorAlert: React.ReactElement | undefined;
  };
  sourceManagement: UseSourceManagementReturn;
  systemInstruction: string;
  onSystemInstructionChange: (value: string) => void;
  isStreamingEnabled: boolean;
  onStreamingToggle: (enabled: boolean) => void;
  temperature: number;
  onTemperatureChange: (value: number) => void;
  topP: number;
  onTopPChange: (value: number) => void;
}

const ChatbotSettingsPanel: React.FunctionComponent<ChatbotSettingsPanelProps> = ({
  selectedModel,
  onModelChange,
  alerts,
  sourceManagement,
  systemInstruction,
  onSystemInstructionChange,
  isStreamingEnabled,
  onStreamingToggle,
  temperature,
  onTemperatureChange,
  topP,
  onTopPChange,
}) => {
  const accordionState = useAccordionState();
  const { selectedServersCount, saveSelectedServersToPlayground } = useMCPSelectionContext();

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
          {/* Sources Accordion Item */}
          <AccordionItem
            isExpanded={accordionState.expandedAccordionItems.includes(ACCORDION_ITEMS.SOURCES)}
          >
            <AccordionToggle
              onClick={() => accordionState.onAccordionToggle(ACCORDION_ITEMS.SOURCES)}
              id={ACCORDION_ITEMS.SOURCES}
            >
              <Flex alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem>
                  {/* Use div to prevent the click event from bubbling up to the accordion toggle */}
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
                <FlexItem>
                  <Title headingLevel="h2" size="lg">
                    Sources
                  </Title>
                </FlexItem>
              </Flex>
            </AccordionToggle>
            <AccordionContent id="sources-content">
              <Form>
                <FormGroup fieldId="sources">
                  <ChatbotSourceUploadPanel
                    successAlert={alerts.successAlert}
                    errorAlert={alerts.errorAlert}
                    handleSourceDrop={sourceManagement.handleSourceDrop}
                    selectedSource={sourceManagement.selectedSource}
                    selectedSourceSettings={sourceManagement.selectedSourceSettings}
                    removeUploadedSource={sourceManagement.removeUploadedSource}
                    setSelectedSourceSettings={sourceManagement.setSelectedSourceSettings}
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
              <div className="pf-v6-u-display-flex pf-v6-u-align-items-center">
                <Title headingLevel="h2" size="lg">
                  MCP servers
                </Title>
                {selectedServersCount > 0 && (
                  <Label key={1} color="blue" className="pf-v6-u-ml-sm">
                    {selectedServersCount}
                  </Label>
                )}
              </div>
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

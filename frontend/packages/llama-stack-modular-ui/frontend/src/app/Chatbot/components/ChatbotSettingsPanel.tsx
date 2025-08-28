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
} from '@patternfly/react-core';
import { ChatbotSourceUploadPanel } from '~/app/Chatbot/sourceUpload/ChatbotSourceUploadPanel';
import { ACCORDION_ITEMS } from '~/app/Chatbot/const';
import useAccordionState from '~/app/Chatbot/hooks/useAccordionState';
import { UseSourceManagementReturn } from '~/app/Chatbot/hooks/useSourceManagement';
import { LlamaModel } from '~/app/types';
import ModelDetailsDropdown from './ModelDetailsDropdown';
import SystemPromptFormGroup from './SystemInstructionFormGroup';

interface ChatbotSettingsPanelProps {
  models: LlamaModel[];
  selectedModel: string;
  onModelChange: (value: string) => void;
  alerts: {
    successAlert: React.ReactElement | undefined;
    errorAlert: React.ReactElement | undefined;
  };
  sourceManagement: UseSourceManagementReturn;
  systemInstruction: string;
  onSystemInstructionChange: (value: string) => void;
}

const ChatbotSettingsPanel: React.FunctionComponent<ChatbotSettingsPanelProps> = ({
  models,
  selectedModel,
  onModelChange,
  alerts,
  sourceManagement,
  systemInstruction,
  onSystemInstructionChange,
}) => {
  const accordionState = useAccordionState();

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
                    models={models}
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
              <Title headingLevel="h2" size="lg">
                MCP servers
              </Title>
            </AccordionToggle>
            <AccordionContent id="mcp-servers-content">
              <Form>
                <FormGroup fieldId="mcpServers">
                  <Title headingLevel="h2" size="md">
                    List of mcp servers
                  </Title>
                </FormGroup>
              </Form>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export { ChatbotSettingsPanel };

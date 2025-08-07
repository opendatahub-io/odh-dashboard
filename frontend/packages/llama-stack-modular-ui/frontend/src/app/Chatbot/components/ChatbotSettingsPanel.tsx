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
  Divider,
  Title,
  Switch,
  FlexItem,
  Flex,
} from '@patternfly/react-core';
import { ChatbotSourceUploadPanel } from '~/app/Chatbot/sourceUpload/ChatbotSourceUploadPanel';
import { ACCORDION_ITEMS } from '~/app/Chatbot/const';
import useAccordionState from '~/app/Chatbot/hooks/useAccordionState';
import { UseSourceManagementReturn } from '~/app/Chatbot/hooks/useSourceManagement';
import ModelDetailsDropdown from './ModelDetailsDropdown';
import SystemPromptFormGroup from './SystemInstructionFormGroup';

interface ChatbotSettingsPanelProps {
  models: Array<{ identifier: string }>;
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
        <div
          style={{
            height: '80vh',
            overflowY: 'auto',
          }}
        >
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
              >
                <Title headingLevel="h1" size="lg">
                  Model details{' '}
                </Title>
              </AccordionToggle>
              <AccordionContent id="model-details-content" className="pf-v6-u-p-md">
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
            <Divider />
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
                    <Switch
                      id="no-label-switch-on"
                      aria-label="Toggle uploaded mode"
                      isChecked={sourceManagement.isRawUploaded}
                      onChange={() =>
                        sourceManagement.setIsRawUploaded(!sourceManagement.isRawUploaded)
                      }
                    />
                  </FlexItem>
                  <FlexItem>
                    <Title headingLevel="h1" size="lg">
                      Sources{' '}
                    </Title>
                  </FlexItem>
                </Flex>
              </AccordionToggle>
              <AccordionContent id="sources-content" className="pf-v6-u-p-md">
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
            <Divider />
            {/* MCP Servers Accordion Item */}
            <AccordionItem
              isExpanded={accordionState.expandedAccordionItems.includes(
                ACCORDION_ITEMS.MCP_SERVERS,
              )}
            >
              <AccordionToggle
                onClick={() => accordionState.onAccordionToggle(ACCORDION_ITEMS.MCP_SERVERS)}
                id={ACCORDION_ITEMS.MCP_SERVERS}
              >
                <Title headingLevel="h1" size="lg">
                  MCP servers{' '}
                </Title>
              </AccordionToggle>
              <AccordionContent id="mcp-servers-content" className="pf-v6-u-p-md">
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
        </div>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export { ChatbotSettingsPanel };

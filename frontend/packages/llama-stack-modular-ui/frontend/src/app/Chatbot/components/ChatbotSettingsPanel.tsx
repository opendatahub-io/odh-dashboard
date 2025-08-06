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
} from '@patternfly/react-core';
import { ChatbotSourceUploadPanel } from '~/app/Chatbot/sourceUpload/ChatbotSourceUploadPanel';
import { ACCORDION_ITEMS } from '~/app/Chatbot/const';
import { UseAccordionStateReturn } from '~/app/Chatbot/hooks/useAccordionState';
import { UseSystemInstructionsReturn } from '~/app/Chatbot/hooks/useSystemInstructions';
import { UseSourceManagementReturn } from '~/app/Chatbot/hooks/useSourceManagement';
import { ModelSelectFormGroup } from './ModelSelectFormGroup';
import { SystemInstructionsFormGroup } from './SystemInstructionsFormGroup';

interface ChatbotSettingsPanelProps {
  accordionState: UseAccordionStateReturn;
  models: Array<{ identifier: string }>;
  selectedModel: string;
  onModelChange: (value: string) => void;
  systemInstructions: UseSystemInstructionsReturn;
  alerts: {
    successAlert: React.ReactElement | undefined;
    errorAlert: React.ReactElement | undefined;
  };
  sourceManagement: UseSourceManagementReturn;
}

const ChatbotSettingsPanel: React.FunctionComponent<ChatbotSettingsPanelProps> = ({
  accordionState,
  models,
  selectedModel,
  onModelChange,
  systemInstructions,
  alerts,
  sourceManagement,
}) => (
  <DrawerPanelContent isResizable defaultSize="400px" minSize="300px">
    <DrawerPanelBody>
      <Accordion asDefinitionList={false}>
        {/* Model Details Accordion Item */}
        <AccordionItem
          isExpanded={accordionState.expandedAccordionItems.includes(ACCORDION_ITEMS.MODEL_DETAILS)}
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
              <ModelSelectFormGroup
                models={models}
                selectedModel={selectedModel}
                onModelChange={onModelChange}
              />
              <SystemInstructionsFormGroup {...systemInstructions} />
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
            <Title headingLevel="h1" size="lg">
              Sources{' '}
            </Title>
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
          isExpanded={accordionState.expandedAccordionItems.includes(ACCORDION_ITEMS.MCP_SERVERS)}
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
    </DrawerPanelBody>
  </DrawerPanelContent>
);

export { ChatbotSettingsPanel };

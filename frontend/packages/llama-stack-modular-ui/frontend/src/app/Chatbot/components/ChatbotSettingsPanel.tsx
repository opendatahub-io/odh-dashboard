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
  DropEvent,
} from '@patternfly/react-core';
import { ChatbotSourceSettings } from '~/app/types';
import { ChatbotSourceUploadPanel } from '~/app/Chatbot/sourceUpload/ChatbotSourceUploadPanel';
import { ACCORDION_ITEMS } from '~/app/Chatbot/const';
import { ModelSelectFormGroup } from './ModelSelectFormGroup';
import { SystemInstructionsFormGroup } from './SystemInstructionsFormGroup';

interface ChatbotSettingsPanelProps {
  expandedAccordionItems: string[];
  onAccordionToggle: (id: string) => void;
  models: Array<{ identifier: string }>;
  selectedModel: string;
  onModelChange: (value: string) => void;
  systemInstructions: string;
  onSystemInstructionsChange: (value: string) => void;
  isSystemInstructionsReadOnly: boolean;
  onEditSystemInstructions: () => void;
  onSaveSystemInstructions: () => void;
  onCancelSystemInstructions: () => void;
  successAlert: React.ReactElement | undefined;
  errorAlert: React.ReactElement | undefined;
  onSourceDrop: (event: DropEvent, source: File[]) => void;
  selectedSource: File[];
  selectedSourceSettings: ChatbotSourceSettings | null;
  onRemoveUploadedSource: () => void;
  onSetSelectedSourceSettings: (settings: ChatbotSourceSettings | null) => void;
}

const ChatbotSettingsPanel: React.FunctionComponent<ChatbotSettingsPanelProps> = ({
  expandedAccordionItems,
  onAccordionToggle,
  models,
  selectedModel,
  onModelChange,
  systemInstructions,
  onSystemInstructionsChange,
  isSystemInstructionsReadOnly,
  onEditSystemInstructions,
  onSaveSystemInstructions,
  onCancelSystemInstructions,
  successAlert,
  errorAlert,
  onSourceDrop,
  selectedSource,
  selectedSourceSettings,
  onRemoveUploadedSource,
  onSetSelectedSourceSettings,
}) => (
  <DrawerPanelContent isResizable defaultSize="400px" minSize="300px">
    <DrawerPanelBody>
      <Accordion asDefinitionList={false}>
        {/* Model Details Accordion Item */}
        <AccordionItem isExpanded={expandedAccordionItems.includes(ACCORDION_ITEMS.MODEL_DETAILS)}>
          <AccordionToggle
            onClick={() => onAccordionToggle(ACCORDION_ITEMS.MODEL_DETAILS)}
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
              <SystemInstructionsFormGroup
                systemInstructions={systemInstructions}
                onSystemInstructionsChange={onSystemInstructionsChange}
                isSystemInstructionsReadOnly={isSystemInstructionsReadOnly}
                onEditSystemInstructions={onEditSystemInstructions}
                onSaveSystemInstructions={onSaveSystemInstructions}
                onCancelSystemInstructions={onCancelSystemInstructions}
              />
            </Form>
          </AccordionContent>
        </AccordionItem>
        <Divider />
        {/* Sources Accordion Item */}
        <AccordionItem isExpanded={expandedAccordionItems.includes(ACCORDION_ITEMS.SOURCES)}>
          <AccordionToggle
            onClick={() => onAccordionToggle(ACCORDION_ITEMS.SOURCES)}
            id={ACCORDION_ITEMS.SOURCES}
          >
            {' '}
            <Title headingLevel="h1" size="lg">
              {' '}
              Sources{' '}
            </Title>{' '}
          </AccordionToggle>
          <AccordionContent id="sources-content" className="pf-v6-u-p-md">
            <Form>
              <FormGroup fieldId="sources">
                <ChatbotSourceUploadPanel
                  successAlert={successAlert}
                  errorAlert={errorAlert}
                  handleSourceDrop={onSourceDrop}
                  selectedSource={selectedSource}
                  selectedSourceSettings={selectedSourceSettings}
                  removeUploadedSource={onRemoveUploadedSource}
                  setSelectedSourceSettings={onSetSelectedSourceSettings}
                />
              </FormGroup>
            </Form>
          </AccordionContent>
        </AccordionItem>
        <Divider />
        {/* MCP Servers Accordion Item */}
        <AccordionItem isExpanded={expandedAccordionItems.includes(ACCORDION_ITEMS.MCP_SERVERS)}>
          <AccordionToggle
            onClick={() => onAccordionToggle(ACCORDION_ITEMS.MCP_SERVERS)}
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

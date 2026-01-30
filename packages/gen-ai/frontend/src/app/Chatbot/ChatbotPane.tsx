import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { CogIcon, TimesIcon } from '@patternfly/react-icons';
import ModelDetailsDropdown from './components/ModelDetailsDropdown';

interface ChatbotPaneProps {
  /** The configId which is also the display label (e.g., "Model 1", "Model 2") */
  configId: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
  onSettingsClick: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

const ChatbotPane: React.FC<ChatbotPaneProps> = ({
  configId,
  selectedModel,
  onModelChange,
  onSettingsClick,
  onClose,
  children,
}) => (
  <Card
    isFullHeight
    isPlain
    style={{ boxShadow: 'none', display: 'flex', flexDirection: 'column', height: '100%' }}
    data-testid={`chatbot-pane-${configId}`}
  >
    <CardHeader style={{ paddingBottom: 'var(--pf-t--global--spacer--sm)' }}>
      <Flex
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        alignItems={{ default: 'alignItemsCenter' }}
        style={{ width: '100%' }}
      >
        <FlexItem>
          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapMd' }}>
            <FlexItem style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{configId}</FlexItem>
            <FlexItem style={{ minWidth: '200px' }}>
              <ModelDetailsDropdown selectedModel={selectedModel} onModelChange={onModelChange} />
            </FlexItem>
          </Flex>
        </FlexItem>
        <FlexItem>
          <Flex gap={{ default: 'gapSm' }}>
            <FlexItem>
              <Button
                variant="plain"
                aria-label={`Open settings for ${configId}`}
                icon={<CogIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  onSettingsClick();
                }}
                data-testid={`chatbot-pane-${configId}-settings-button`}
              />
            </FlexItem>
            <FlexItem>
              <Button
                variant="plain"
                aria-label={`Close ${configId}`}
                icon={<TimesIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                data-testid={`chatbot-pane-${configId}-close-button`}
              />
            </FlexItem>
          </Flex>
        </FlexItem>
      </Flex>
    </CardHeader>
    <Divider style={{ marginTop: 'var(--pf-t--global--spacer--sm)' }} />
    <CardBody
      style={{
        padding: 0,
        overflow: 'hidden',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </CardBody>
  </Card>
);

export default ChatbotPane;

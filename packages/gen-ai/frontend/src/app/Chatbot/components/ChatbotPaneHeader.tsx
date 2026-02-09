import * as React from 'react';
import { Button, Divider, Flex, FlexItem } from '@patternfly/react-core';
import { CogIcon, TimesIcon } from '@patternfly/react-icons';
import { ChatbotHeaderMain } from '@patternfly/chatbot';
import ModelDetailsDropdown from './ModelDetailsDropdown';

interface ChatbotPaneHeaderProps {
  /** Optional label (e.g., "Model 1", "Model 2" in compare mode) */
  label?: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
  onSettingsClick: () => void;
  /** Optional close button handler (for compare mode) */
  onCloseClick?: () => void;
  /** Whether to show a divider below the header */
  hasDivider?: boolean;
  /** Test ID prefix for the header elements */
  testIdPrefix?: string;
}

/**
 * Generic header component for chatbot panes.
 * Used in both single mode and compare mode.
 */
const ChatbotPaneHeader: React.FC<ChatbotPaneHeaderProps> = ({
  label,
  selectedModel,
  onModelChange,
  onSettingsClick,
  onCloseClick,
  hasDivider,
  testIdPrefix = 'chatbot',
}) => (
  <div
    style={{
      backgroundColor: 'var(--pf-t--global--background--color--100)',
      padding: '1rem 1.5rem',
    }}
  >
    <ChatbotHeaderMain>
      <Flex
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        alignItems={{ default: 'alignItemsCenter' }}
        style={{ width: '100%' }}
      >
        <FlexItem>
          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapMd' }}>
            {label && (
              <FlexItem style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</FlexItem>
            )}
            <FlexItem style={{ minWidth: '200px' }}>
              <ModelDetailsDropdown selectedModel={selectedModel} onModelChange={onModelChange} />
            </FlexItem>
            <FlexItem>
              <Button
                variant="plain"
                aria-label="Open settings panel"
                icon={<CogIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  onSettingsClick();
                }}
                data-testid={`${testIdPrefix}-settings-button`}
              />
            </FlexItem>
          </Flex>
        </FlexItem>
        {onCloseClick && (
          <FlexItem>
            <Button
              variant="plain"
              aria-label="Close pane"
              icon={<TimesIcon />}
              onClick={(e) => {
                e.stopPropagation();
                onCloseClick();
              }}
              data-testid={`${testIdPrefix}-close-button`}
            />
          </FlexItem>
        )}
      </Flex>
    </ChatbotHeaderMain>
    {hasDivider && <Divider style={{ marginTop: 'var(--pf-t--global--spacer--md)' }} />}
  </div>
);

export default ChatbotPaneHeader;

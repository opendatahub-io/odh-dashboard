import * as React from 'react';
import { Button, Divider, Flex, FlexItem, Label, Spinner } from '@patternfly/react-core';
import { CogIcon, TimesIcon } from '@patternfly/react-icons';
import { ChatbotHeaderMain } from '@patternfly/chatbot';
import { ResponseMetrics } from '~/app/types';
import { formatDuration } from '~/app/Chatbot/ChatbotMessagesMetrics';
import ModelDetailsDropdown from './ModelDetailsDropdown';

interface ChatbotPaneHeaderProps {
  /** Optional label (e.g., "Model 1", "Model 2" in compare mode) */
  label?: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
  onSettingsClick: () => void;
  /** Optional close button handler (for compare mode) */
  onCloseClick?: () => void;
  /** Metrics from the last response (latency, tokens, TTFT) */
  metrics?: ResponseMetrics | null;
  /** Whether a response is currently being generated */
  isLoading?: boolean;
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
  metrics,
  isLoading,
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
          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
            {label && (
              <FlexItem style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</FlexItem>
            )}
            <FlexItem>
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

    {/* Response metrics row */}
    {(metrics || isLoading) && (
      <Flex gap={{ default: 'gapSm' }} style={{ marginTop: 'var(--pf-t--global--spacer--md)' }}>
        {isLoading ? (
          <FlexItem>
            <Label variant="outline" isCompact data-testid={`${testIdPrefix}-loading`}>
              <Spinner size="sm" aria-label="Loading" />
            </Label>
          </FlexItem>
        ) : (
          metrics && (
            <>
              <FlexItem>
                <Label variant="outline" isCompact data-testid={`${testIdPrefix}-latency-metric`}>
                  {formatDuration(metrics.latency_ms)}
                </Label>
              </FlexItem>
              {metrics.usage && (
                <FlexItem>
                  <Label variant="outline" isCompact data-testid={`${testIdPrefix}-tokens-metric`}>
                    T: {metrics.usage.total_tokens}
                  </Label>
                </FlexItem>
              )}
              {metrics.time_to_first_token_ms !== undefined && (
                <FlexItem>
                  <Label variant="outline" isCompact data-testid={`${testIdPrefix}-ttft-metric`}>
                    TTFT: {formatDuration(metrics.time_to_first_token_ms)}
                  </Label>
                </FlexItem>
              )}
            </>
          )
        )}
      </Flex>
    )}

    {hasDivider && <Divider style={{ marginTop: 'var(--pf-t--global--spacer--md)' }} />}
  </div>
);

export default ChatbotPaneHeader;

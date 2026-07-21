import * as React from 'react';
import {
  Button,
  Content,
  Divider,
  Flex,
  FlexItem,
  Label,
  Popover,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon, TimesIcon } from '@patternfly/react-icons';
import { ChatbotHeaderMain } from '@patternfly/chatbot';
import AiChatbotIcon from '~/app/images/icons/AiChatbotIcon';
import { ResponseMetrics } from '~/app/types';
import { formatDuration } from '~/app/Chatbot/ChatbotMessagesMetrics';

interface ChatbotPaneHeaderProps {
  /** Compare mode label (e.g. "Chat 1"). When absent and no agentName, renders nothing. */
  label?: string;
  /** Optional close button handler (compare mode) */
  onCloseClick?: () => void;
  /** Metrics from the last response (latency, tokens, TTFT) */
  metrics?: ResponseMetrics | null;
  /** Whether a response is currently being generated */
  isLoading?: boolean;
  /** Whether to show a divider below the header */
  hasDivider?: boolean;
  /** Test ID prefix for the header elements */
  testIdPrefix?: string;
  isDarkMode?: boolean;
  /** Name of the currently loaded agent profile */
  agentName?: string;
  /** When true, shows an "Unsaved" indicator next to the agent info icon */
  isProfileDirty?: boolean;
  /** Called when the user clicks "Clear agent" */
  onClearAgent?: () => void;
  /** Whether the settings panel is open (highlights the active config label in compare mode) */
  isSettingsOpen?: boolean;
  /** Whether this pane is the active config in compare mode */
  isActiveConfig?: boolean;
}

const ChatbotPaneHeader: React.FC<ChatbotPaneHeaderProps> = ({
  label,
  onCloseClick,
  metrics,
  isLoading,
  hasDivider,
  testIdPrefix = 'chatbot',
  isDarkMode,
  agentName,
  isProfileDirty = false,
  onClearAgent,
  isSettingsOpen,
  isActiveConfig,
}) => {
  // Nothing to show: no identity content and no metrics/loading content
  if (!label && !agentName && !metrics && !isLoading) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: isDarkMode
          ? 'var(--pf-t--global--dark--background--color--100)'
          : 'var(--pf-t--global--background--color--100)',
        padding: '1rem 1.5rem',
      }}
    >
      <ChatbotHeaderMain>
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
          fullWidth={{ default: 'fullWidth' }}
        >
          {/* Compare mode: just the label */}
          {label && !agentName && (
            <FlexItem>
              <span
                style={{
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  color:
                    isSettingsOpen && isActiveConfig
                      ? 'var(--pf-t--global--color--brand--default)'
                      : undefined,
                }}
              >
                {label}
              </span>
            </FlexItem>
          )}

          {/* Agent loaded (single mode or compare mode with agent) */}
          {agentName && (
            <FlexItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                {label && (
                  <>
                    <FlexItem style={{ fontWeight: 600 }}>{label}</FlexItem>
                    <Divider
                      orientation={{ default: 'vertical' }}
                      style={{ height: '1em', alignSelf: 'center' }}
                    />
                  </>
                )}
                <FlexItem style={{ fontWeight: 600 }}>Agent</FlexItem>
                <FlexItem>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      backgroundColor: 'var(--pf-t--color--teal--10)',
                      padding: 'var(--pf-t--global--spacer--xs)',
                    }}
                  >
                    <AiChatbotIcon />
                  </span>
                </FlexItem>
                <FlexItem>
                  <Title headingLevel="h4" size="md" style={{ whiteSpace: 'nowrap' }}>
                    {agentName}
                  </Title>
                </FlexItem>
                <FlexItem>
                  <Popover
                    headerContent="Agent"
                    bodyContent="This agent includes model settings, prompts, knowledge sources, and guardrails."
                  >
                    <Button
                      variant="plain"
                      aria-label="Agent information"
                      icon={<OutlinedQuestionCircleIcon />}
                      data-testid="agent-info-button"
                    />
                  </Popover>
                </FlexItem>
                {isProfileDirty && (
                  <FlexItem>
                    <Content component="small" className="pf-v6-u-color-200">
                      <i>(Unsaved)</i>
                    </Content>
                  </FlexItem>
                )}
              </Flex>
            </FlexItem>
          )}

          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
              {agentName && onClearAgent && (
                <FlexItem>
                  <Button variant="link" onClick={onClearAgent} data-testid="agent-clear-button">
                    Clear agent
                  </Button>
                </FlexItem>
              )}
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
          </FlexItem>
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
                    <Label
                      variant="outline"
                      isCompact
                      data-testid={`${testIdPrefix}-tokens-metric`}
                    >
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
};

export default ChatbotPaneHeader;

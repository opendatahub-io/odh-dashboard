import * as React from 'react';
import { Button, Divider, Flex, FlexItem, Label, Spinner, Content } from '@patternfly/react-core';
import { PencilAltIcon, TimesIcon } from '@patternfly/react-icons';
import { ChatbotHeaderMain } from '@patternfly/chatbot';
import { ResponseMetrics } from '~/app/types';
import { formatDuration } from '~/app/Chatbot/ChatbotMessagesMetrics';
import ModelDetailsDropdown from './ModelDetailsDropdown';

interface ChatbotPaneHeaderProps {
  /** Optional label (e.g., "Model 1", "Model 2" in compare mode) */
  label?: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
  /** Optional close button handler (for compare mode) */
  onCloseClick?: () => void;
  /** Metrics from the last response (latency, tokens, TTFT) */
  metrics?: ResponseMetrics | null;
  /** Whether a response is currently being generated */
  isLoading?: boolean;
  /** Whether to show a divider below the header */
  hasDivider?: boolean;
  isSettingsOpen?: boolean;
  isActiveConfig?: boolean;
  /** Test ID prefix for the header elements */
  testIdPrefix?: string;
  isDarkMode?: boolean;
  isDisabled?: boolean;
  /** Name of the currently loaded agent profile, shown before the Model label */
  agentName?: string;
  /** When true, shows a "Preview" badge next to the agent name */
  isPreviewMode?: boolean;
  /** Called when the user clicks the edit icon to exit preview mode */
  onExitPreview?: () => void;
  /** When true, the edit icon is disabled (e.g. validation warnings prevent editing) */
  hasValidationWarnings?: boolean;
}

/**
 * Generic header component for chatbot panes.
 * Used in both single mode and compare mode.
 */
const ChatbotPaneHeader: React.FC<ChatbotPaneHeaderProps> = ({
  label,
  selectedModel,
  onModelChange,
  onCloseClick,
  metrics,
  isLoading,
  hasDivider,
  isSettingsOpen,
  isActiveConfig,
  testIdPrefix = 'chatbot',
  isDarkMode,
  isDisabled = false,
  agentName,
  isPreviewMode = false,
  onExitPreview,
  hasValidationWarnings = false,
}) => (
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
        style={{ width: '100%' }}
      >
        <FlexItem>
          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
            {label && (
              <>
                <FlexItem
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
                </FlexItem>
                {!isSettingsOpen && (
                  <Divider
                    orientation={{ default: 'vertical' }}
                    style={{ height: '1em', alignSelf: 'center' }}
                  />
                )}
              </>
            )}
            {agentName && !isSettingsOpen && (
              <>
                <FlexItem>
                  <Content
                    component="p"
                    style={{
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--pf-t--global--spacer--sm)',
                      fontSize: 'var(--pf-t--global--font--size--lg)',
                    }}
                  >
                    <strong>{agentName}</strong>
                    {isPreviewMode && (
                      <>
                        <Label isCompact color="blue" data-testid="agent-preview-label">
                          Preview
                        </Label>
                        {onExitPreview && (
                          <Button
                            variant="plain"
                            aria-label="Edit agent configuration"
                            icon={<PencilAltIcon />}
                            isDisabled={hasValidationWarnings}
                            onClick={onExitPreview}
                            data-testid="agent-exit-preview-button"
                          />
                        )}
                      </>
                    )}
                  </Content>
                </FlexItem>
                <FlexItem alignSelf={{ default: 'alignSelfCenter' }}>
                  <Divider
                    orientation={{ default: 'vertical' }}
                    style={{ height: 'var(--pf-t--global--font--size--body--default)' }}
                  />
                </FlexItem>
              </>
            )}
            {!isSettingsOpen && (
              <FlexItem>
                <Content component="p" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                  Model
                </Content>
              </FlexItem>
            )}
            <FlexItem>
              <ModelDetailsDropdown
                selectedModel={selectedModel}
                onModelChange={onModelChange}
                testId="chatbot-model-selector-toggle"
                isDisabled={isDisabled}
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

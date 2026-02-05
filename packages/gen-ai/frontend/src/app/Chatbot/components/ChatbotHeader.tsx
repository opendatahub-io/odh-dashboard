import * as React from 'react';
import { Button, Divider, Flex, FlexItem, Label } from '@patternfly/react-core';
import { CogIcon, TimesIcon } from '@patternfly/react-icons';
import { ResponseMetrics } from '~/app/types';
import { formatDuration } from '~/app/Chatbot/ChatbotMessagesMetrics';
import ModelDetailsDropdown from '~/app/Chatbot/components/ModelDetailsDropdown';

// CSS for animated dots
const dotAnimationStyle = `
@keyframes dotPulse {
  0%, 20% { opacity: 0; }
  40% { opacity: 1; }
  100% { opacity: 0; }
}
`;

const LoadingDots: React.FC = () => (
  <>
    <style>{dotAnimationStyle}</style>
    <span data-testid="loading-dots">
      <span style={{ animation: 'dotPulse 1.4s infinite', animationDelay: '0s' }}>.</span>
      <span style={{ animation: 'dotPulse 1.4s infinite', animationDelay: '0.2s' }}>.</span>
      <span style={{ animation: 'dotPulse 1.4s infinite', animationDelay: '0.4s' }}>.</span>
    </span>
  </>
);

interface ChatbotHeaderProps {
  /** Label to display (e.g., "Model 1", "Model 2"). If not provided, no label is shown. */
  label?: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
  onSettingsClick: () => void;
  /** Close button click handler. If not provided, close button is hidden. */
  onClose?: () => void;
  /** Metrics from the last response */
  metrics?: ResponseMetrics | null;
  /** Whether a response is currently being generated */
  isLoading?: boolean;
  /** Whether to show a divider below the header */
  showDivider?: boolean;
  /** Test ID prefix for data-testid attributes */
  testIdPrefix?: string;
}

const ChatbotHeader: React.FC<ChatbotHeaderProps> = ({
  label,
  selectedModel,
  onModelChange,
  onSettingsClick,
  onClose,
  metrics,
  isLoading,
  showDivider = true,
  testIdPrefix = 'chatbot-header',
}) => (
  <div data-testid={testIdPrefix}>
    {/* Main header row */}
    <Flex
      justifyContent={{ default: 'justifyContentSpaceBetween' }}
      alignItems={{ default: 'alignItemsCenter' }}
      style={{ width: '100%' }}
    >
      <FlexItem>
        <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapMd' }}>
          {label && <FlexItem style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</FlexItem>}
          <FlexItem style={{ minWidth: '200px' }}>
            <ModelDetailsDropdown selectedModel={selectedModel} onModelChange={onModelChange} />
          </FlexItem>
          <FlexItem>
            <Button
              variant="plain"
              aria-label={label ? `Open settings for ${label}` : 'Open settings panel'}
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
      {onClose && (
        <FlexItem>
          <Button
            variant="plain"
            aria-label={label ? `Close ${label}` : 'Close'}
            icon={<TimesIcon />}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            data-testid={`${testIdPrefix}-close-button`}
          />
        </FlexItem>
      )}
    </Flex>

    {/* Metrics row */}
    {(metrics || isLoading) && (
      <Flex gap={{ default: 'gapSm' }} style={{ marginTop: 'var(--pf-t--global--spacer--md)' }}>
        {isLoading ? (
          <FlexItem>
            <Label variant="outline" isCompact data-testid={`${testIdPrefix}-loading`}>
              <LoadingDots />
            </Label>
          </FlexItem>
        ) : (
          <>
            <FlexItem>
              <Label variant="outline" isCompact data-testid={`${testIdPrefix}-latency`}>
                {formatDuration(metrics!.latency_ms)}
              </Label>
            </FlexItem>
            {metrics!.usage && (
              <FlexItem>
                <Label variant="outline" isCompact data-testid={`${testIdPrefix}-tokens`}>
                  T: {metrics!.usage.total_tokens}
                </Label>
              </FlexItem>
            )}
            {metrics!.time_to_first_token_ms !== undefined && (
              <FlexItem>
                <Label variant="outline" isCompact data-testid={`${testIdPrefix}-ttft`}>
                  TTFT: {formatDuration(metrics!.time_to_first_token_ms)}
                </Label>
              </FlexItem>
            )}
          </>
        )}
      </Flex>
    )}

    {/* Divider */}
    {showDivider && <Divider style={{ marginTop: 'var(--pf-t--global--spacer--md)' }} />}
  </div>
);

export default ChatbotHeader;

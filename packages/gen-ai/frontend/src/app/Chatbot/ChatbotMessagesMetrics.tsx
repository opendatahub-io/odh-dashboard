import * as React from 'react';
import { ExpandableSection, Flex, FlexItem, Label } from '@patternfly/react-core';
import { ResponseMetrics } from '~/app/types';

interface ChatbotMessagesMetricsProps {
  metrics: ResponseMetrics;
}

/**
 * Formats a duration in milliseconds to a human-readable string.
 * - Values >= 1000ms are displayed as seconds (e.g., "1.52 s")
 * - Values < 1000ms are displayed as milliseconds (e.g., "523ms")
 */
const formatDuration = (ms: number): string => {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)} s`;
  }
  return `${ms}ms`;
};

/**
 * Collapsible metrics display component for chat messages.
 * Shows response latency, token count, and TTFT (for streaming responses).
 */
export const ChatbotMessagesMetrics: React.FC<ChatbotMessagesMetricsProps> = ({ metrics }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const toggleText = isExpanded ? 'Hide metrics' : 'Show metrics';

  return (
    <ExpandableSection
      toggleText={toggleText}
      onToggle={() => setIsExpanded(!isExpanded)}
      isExpanded={isExpanded}
    >
      <Flex gap={{ default: 'gapMd' }}>
        <FlexItem>
          <Label variant="outline" isCompact>
            {formatDuration(metrics.latency_ms)}
          </Label>
        </FlexItem>
        {metrics.usage && (
          <FlexItem>
            <Label variant="outline" isCompact>
              Tokens: {metrics.usage.total_tokens}
            </Label>
          </FlexItem>
        )}
        {metrics.time_to_first_token_ms !== undefined && (
          <FlexItem>
            <Label variant="outline" isCompact>
              TTFT: {formatDuration(metrics.time_to_first_token_ms)}
            </Label>
          </FlexItem>
        )}
      </Flex>
    </ExpandableSection>
  );
};

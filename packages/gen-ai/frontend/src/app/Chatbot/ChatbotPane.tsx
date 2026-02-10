import * as React from 'react';
import { Card, CardBody } from '@patternfly/react-core';
import { ResponseMetrics } from '~/app/types';
import ChatbotPaneHeader from './components/ChatbotPaneHeader';

interface ChatbotPaneProps {
  /** The configId used for state management */
  configId: string;
  /** Display label shown in the UI (e.g., "Model 1", "Model 2") */
  displayLabel: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
  onSettingsClick: () => void;
  onClose: () => void;
  children: React.ReactNode;
  /** Metrics from the last response (latency, tokens, TTFT) */
  metrics?: ResponseMetrics | null;
  /** Whether a response is currently being generated */
  isLoading?: boolean;
}

/**
 * Wrapper component for a single chatbot pane in compare mode.
 * Includes header with label, model dropdown, settings, and close button.
 */
const ChatbotPane: React.FC<ChatbotPaneProps> = ({
  configId,
  displayLabel,
  selectedModel,
  onModelChange,
  onSettingsClick,
  onClose,
  children,
  metrics,
  isLoading,
}) => (
  <Card
    isFullHeight
    isPlain
    style={{ boxShadow: 'none', display: 'flex', flexDirection: 'column', height: '100%' }}
    data-testid={`chatbot-pane-${configId}`}
    role="region"
    aria-label={displayLabel}
  >
    <ChatbotPaneHeader
      label={displayLabel}
      selectedModel={selectedModel}
      onModelChange={onModelChange}
      onSettingsClick={onSettingsClick}
      onCloseClick={onClose}
      metrics={metrics}
      isLoading={isLoading}
      hasDivider
      testIdPrefix={`chatbot-pane-${configId}`}
    />
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

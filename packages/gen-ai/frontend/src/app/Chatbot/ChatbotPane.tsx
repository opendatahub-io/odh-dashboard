import * as React from 'react';
import { Card, CardBody, CardHeader } from '@patternfly/react-core';
import { ResponseMetrics } from '~/app/types';
import ChatbotHeader from './components/ChatbotHeader';

interface ChatbotPaneProps {
  /** The configId which is also the display label (e.g., "Model 1", "Model 2") */
  configId: string;
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

const ChatbotPane: React.FC<ChatbotPaneProps> = ({
  configId,
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
  >
    <CardHeader style={{ paddingBottom: 'var(--pf-t--global--spacer--sm)' }}>
      <ChatbotHeader
        label={configId}
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        onSettingsClick={onSettingsClick}
        onClose={onClose}
        metrics={metrics}
        isLoading={isLoading}
        testIdPrefix={`chatbot-pane-${configId}`}
      />
    </CardHeader>
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

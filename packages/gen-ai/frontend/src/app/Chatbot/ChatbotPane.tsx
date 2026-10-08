import * as React from 'react';
import { Card, CardBody } from '@patternfly/react-core';
import useDarkMode from '~/app/Chatbot/hooks/useDarkMode';
import ChatbotPaneHeader from './components/ChatbotPaneHeader';

interface ChatbotPaneProps {
  /** The configId used for state management */
  configId: string;
  /** Display label shown in the UI (e.g., "Chat 1", "Chat 2") */
  displayLabel: string;
  onClose: () => void;
  children: React.ReactNode;
  isSettingsOpen?: boolean;
  isActiveConfig?: boolean;
}

/**
 * Wrapper component for a single chatbot pane in compare mode.
 * Includes header with label and close button.
 */
const ChatbotPane: React.FC<ChatbotPaneProps> = ({
  configId,
  displayLabel,
  onClose,
  children,
  isSettingsOpen,
  isActiveConfig,
}) => {
  const isDarkMode = useDarkMode();
  return (
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
        onCloseClick={onClose}
        isSettingsOpen={isSettingsOpen}
        isActiveConfig={isActiveConfig}
        hasDivider
        testIdPrefix={`chatbot-pane-${configId}`}
        isDarkMode={isDarkMode}
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
};

export default ChatbotPane;

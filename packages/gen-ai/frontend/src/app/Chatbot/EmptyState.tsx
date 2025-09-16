import React from 'react';
import { Button, EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import emptyStateImage from '~/app/bgimages/empty-state.svg';

type ChatbotEmptyStateProps = {
  title: string;
  description: string;
  actionButtonText: string;
  handleActionButtonClick: () => void;
};

const ChatbotEmptyState: React.FC<ChatbotEmptyStateProps> = ({
  title,
  description,
  actionButtonText,
  handleActionButtonClick,
}: {
  handleActionButtonClick: () => void;
  title: string;
  description: string;
  actionButtonText: string;
}) => (
  <EmptyState
    titleText={title}
    icon={() => <img src={emptyStateImage} alt="AI Playground Infrastructure" />}
    variant="lg"
    isFullHeight
  >
    <EmptyStateBody>
      {description}
      <EmptyStateFooter>
        <Button variant="primary" onClick={handleActionButtonClick}>
          {actionButtonText}
        </Button>
      </EmptyStateFooter>
    </EmptyStateBody>
  </EmptyState>
);

export default ChatbotEmptyState;

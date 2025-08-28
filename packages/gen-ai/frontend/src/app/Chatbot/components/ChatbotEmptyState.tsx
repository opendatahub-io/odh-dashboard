import React from 'react';
import { Button, EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import emptyStateImage from '~/app/bgimages/empty-state.svg';

const ChatbotEmptyState: React.FC = () => {
  const handleConfigure = () => {
    // TODO: Implement configuration logic
  };

  return (
    <EmptyState
      titleText="Enable AI Playground"
      icon={() => <img src={emptyStateImage} alt="AI Playground Infrastructure" />}
      variant="lg"
      isFullHeight
    >
      <EmptyStateBody>
        Create a playground to chat with the generative models deployed in this project. Experiment
        with model output using a simple RAG simulation, custom prompt and MCP servers.
        <EmptyStateFooter>
          <Button variant="primary" onClick={handleConfigure}>
            Configure AI Playground
          </Button>
        </EmptyStateFooter>
      </EmptyStateBody>
    </EmptyState>
  );
};

export { ChatbotEmptyState };

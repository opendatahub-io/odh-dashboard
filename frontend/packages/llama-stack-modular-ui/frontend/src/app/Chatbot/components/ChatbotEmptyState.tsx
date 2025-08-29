import React from 'react';
import { Button, EmptyState, EmptyStateBody, Title } from '@patternfly/react-core';
import emptyStateImage from '~/app/bgimages/empty-state.svg';

const ChatbotEmptyState: React.FC = () => {
  const handleConfigure = () => {
    // TODO: Implement configuration logic
  };

  return (
    <EmptyState style={{ marginTop: '100px' }}>
      <EmptyStateBody
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
      >
        <img src={emptyStateImage} alt="AI Playground Infrastructure" />
        <div>
          <Title headingLevel="h1" size="lg">
            Enable AI Playground
          </Title>
          <p>
            Create a playground environment for testing available AI assets, building a simple RAG
            application, testing MCP servers and more.
          </p>
        </div>
        <Button variant="primary" onClick={handleConfigure}>
          Configure AI Playground
        </Button>
      </EmptyStateBody>
    </EmptyState>
  );
};

export { ChatbotEmptyState };

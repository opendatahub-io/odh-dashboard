import React from 'react';
import { Button, EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import emptyStateImage from '~/app/bgimages/empty-state.svg';

type ModelsEmptyStateProps = {
  title: string;
  description: React.ReactNode;
  actionButtonText?: React.ReactNode;
  handleActionButtonClick?: () => void;
};

const ModelsEmptyState: React.FC<ModelsEmptyStateProps> = ({
  title,
  description,
  actionButtonText,
  handleActionButtonClick,
}) => (
  <EmptyState
    titleText={title}
    icon={() => <img src={emptyStateImage} alt="Chat Playground Infrastructure" />}
    variant="lg"
    isFullHeight
    data-testid="empty-state"
  >
    <EmptyStateBody data-testid="empty-state-message">
      {description}
      {actionButtonText && handleActionButtonClick && (
        <EmptyStateFooter>
          <Button
            variant="primary"
            onClick={handleActionButtonClick}
            data-testid="empty-state-action-button"
          >
            {actionButtonText}
          </Button>
        </EmptyStateFooter>
      )}
    </EmptyStateBody>
  </EmptyState>
);

export default ModelsEmptyState;

import React from 'react';
import { Button, EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import emptyStateImage from '~/app/bgimages/empty-state.svg';

type ModelsEmptyStateProps = {
  title: string;
  description: React.ReactNode;
  actionButtonText?: React.ReactNode;
  actionButtonHref?: string;
  handleActionButtonClick?: () => void;
  'data-testid'?: string;
};

const ModelsEmptyState: React.FC<ModelsEmptyStateProps> = ({
  title,
  description,
  actionButtonText,
  actionButtonHref,
  handleActionButtonClick,
  'data-testid': dataTestId = 'empty-state',
}) => (
  <EmptyState
    titleText={title}
    icon={() => <img src={emptyStateImage} alt="Chat Playground Infrastructure" />}
    variant="lg"
    isFullHeight
    data-testid={dataTestId}
  >
    <EmptyStateBody data-testid="empty-state-message">
      {description}
      {actionButtonText && (handleActionButtonClick || actionButtonHref) && (
        <EmptyStateFooter>
          <Button
            variant="primary"
            component={actionButtonHref ? 'a' : 'button'}
            href={actionButtonHref}
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

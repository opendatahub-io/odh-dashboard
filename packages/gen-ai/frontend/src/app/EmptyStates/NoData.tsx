import React from 'react';
import {
  Button,
  ButtonVariant,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import emptyStateImage from '~/app/bgimages/empty-state.svg';

type ModelsEmptyStateProps = {
  title: string;
  description: React.ReactNode;
  actionButtonText?: React.ReactNode;
  actionButtonHref?: string;
  handleActionButtonClick?: () => void;
  secondaryActionButtonText?: React.ReactNode;
  handleSecondaryActionButtonClick?: () => void;
  'data-testid'?: string;
};

const ModelsEmptyState: React.FC<ModelsEmptyStateProps> = ({
  title,
  description,
  actionButtonText,
  actionButtonHref,
  handleActionButtonClick,
  secondaryActionButtonText,
  handleSecondaryActionButtonClick,
  'data-testid': dataTestId = 'empty-state',
}) => (
  <EmptyState
    titleText={title}
    icon={() => <img src={emptyStateImage} alt="Chat Playground Infrastructure" />}
    variant="lg"
    isFullHeight
    data-testid={dataTestId}
  >
    <EmptyStateBody data-testid="empty-state-message">{description}</EmptyStateBody>
    <EmptyStateFooter>
      {actionButtonText && (handleActionButtonClick || actionButtonHref) && (
        <Button
          variant="primary"
          component={
            actionButtonHref
              ? (props: React.ComponentProps<'a'>) => <Link {...props} to={actionButtonHref} />
              : 'button'
          }
          onClick={handleActionButtonClick}
          data-testid="empty-state-action-button"
        >
          {actionButtonText}
        </Button>
      )}
      {secondaryActionButtonText && handleSecondaryActionButtonClick && (
        <Button
          variant={ButtonVariant.link}
          onClick={handleSecondaryActionButtonClick}
          data-testid="empty-state-secondary-action-button"
        >
          {secondaryActionButtonText}
        </Button>
      )}
    </EmptyStateFooter>
  </EmptyState>
);

export default ModelsEmptyState;

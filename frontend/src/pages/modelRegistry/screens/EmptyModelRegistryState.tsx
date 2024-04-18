import {
  Button,
  ButtonVariant,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateHeader,
  EmptyStateIcon,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';

type EmptyModelRegistryStateType = {
  title: string;
  description: string;
  primaryActionText: string;
  primaryActionOnClick: () => void;
  secondaryActionText?: string;
  secondaryActionOnClick?: () => void;
};

const EmptyModelRegistryState: React.FC<EmptyModelRegistryStateType> = ({
  title,
  description,
  primaryActionText,
  secondaryActionText,
  primaryActionOnClick,
  secondaryActionOnClick,
}) => (
  <EmptyState variant={EmptyStateVariant.sm} data-testid="empty-model-registry">
    <EmptyStateHeader titleText={title} icon={<EmptyStateIcon icon={PlusCircleIcon} />} />
    <EmptyStateBody>{description}</EmptyStateBody>
    <EmptyStateFooter>
      <EmptyStateActions>
        <Button
          data-testid="empty-model-registry-primary-action"
          variant={ButtonVariant.primary}
          onClick={primaryActionOnClick}
        >
          {primaryActionText}
        </Button>
      </EmptyStateActions>
      {secondaryActionText && (
        <Button
          data-testid="empty-model-registry-secondary-action"
          variant="link"
          onClick={secondaryActionOnClick}
        >
          {secondaryActionText}
        </Button>
      )}
    </EmptyStateFooter>
  </EmptyState>
);

export default EmptyModelRegistryState;

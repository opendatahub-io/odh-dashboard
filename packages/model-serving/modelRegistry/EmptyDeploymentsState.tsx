//TODO: Move this to a shared library eventually
import React from 'react';
import {
  Button,
  ButtonVariant,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';

type EmptyDeploymentsStateType = {
  testid?: string;
  title: string;
  description: React.ReactNode;
  primaryActionText?: string;
  primaryActionOnClick?: () => void;
  secondaryActionText?: string;
  secondaryActionOnClick?: () => void;
  headerIcon?: React.ComponentType;
  customAction?: React.ReactNode;
};

const EmptyDeploymentsState: React.FC<EmptyDeploymentsStateType> = ({
  testid,
  title,
  description,
  primaryActionText,
  secondaryActionText,
  primaryActionOnClick,
  secondaryActionOnClick,
  headerIcon,
  customAction,
}) => (
  <EmptyState
    icon={headerIcon ?? PlusCircleIcon}
    titleText={title}
    variant={EmptyStateVariant.sm}
    data-testid={testid}
  >
    <EmptyStateBody>{description}</EmptyStateBody>
    <EmptyStateFooter>
      {primaryActionText && (
        <EmptyStateActions>
          <Button
            data-testid="empty-deployment-primary-action"
            variant={ButtonVariant.primary}
            onClick={primaryActionOnClick}
          >
            {primaryActionText}
          </Button>
        </EmptyStateActions>
      )}

      {secondaryActionText && (
        <EmptyStateActions>
          <Button
            data-testid="empty-deployment-secondary-action"
            variant="link"
            onClick={secondaryActionOnClick}
          >
            {secondaryActionText}
          </Button>
        </EmptyStateActions>
      )}

      {customAction && <EmptyStateActions>{customAction}</EmptyStateActions>}
    </EmptyStateFooter>
  </EmptyState>
);

export default EmptyDeploymentsState;

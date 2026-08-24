import * as React from 'react';
import {
  Button,
  ButtonProps,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateProps,
} from '@patternfly/react-core';

interface ActionableEmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: ButtonProps['variant'];
}

interface ActionableEmptyStateProps {
  titleText: string;
  headingLevel?: EmptyStateProps['headingLevel'];
  icon?: React.ComponentType;
  body?: React.ReactNode;
  action?: ActionableEmptyStateAction;
  'data-testid'?: string;
}

/**
 * A generic empty state: icon + title + body + at most one primary action
 * button. Carries no domain vocabulary of its own — callers supply all text,
 * icon, and behavior via props.
 */
const ActionableEmptyState: React.FC<ActionableEmptyStateProps> = ({
  titleText,
  headingLevel = 'h4',
  icon,
  body,
  action,
  'data-testid': testId,
}) => (
  <EmptyState titleText={titleText} headingLevel={headingLevel} icon={icon} data-testid={testId}>
    {body ? <EmptyStateBody>{body}</EmptyStateBody> : null}
    {action ? (
      <EmptyStateFooter>
        <EmptyStateActions>
          <Button variant={action.variant ?? 'primary'} onClick={action.onClick}>
            {action.label}
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    ) : null}
  </EmptyState>
);

export default ActionableEmptyState;

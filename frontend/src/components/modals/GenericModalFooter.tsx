import * as React from 'react';
import {
  ActionList,
  ActionListItem,
  ActionListGroup,
  Alert,
  Button,
  Stack,
  StackItem,
} from '@patternfly/react-core';

export type ButtonAction = {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'link';
  clickOnEnter?: boolean;
  dataTestId?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
};

type GenericModalFooterProps = {
  buttonActions: ButtonAction[];
  buttonRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
  alertTitle?: string;
  error?: Error | React.ReactNode;
  alertLinks?: React.ReactNode;
};

const GenericModalFooter: React.FC<GenericModalFooterProps> = ({
  buttonActions,
  buttonRefs,
  error,
  alertTitle,
  alertLinks,
}) => (
  <Stack hasGutter>
    {error && (
      <StackItem>
        <Alert
          data-testid="error-message-alert"
          isInline
          variant="danger"
          title={alertTitle}
          actionLinks={alertLinks}
        >
          {error instanceof Error ? error.message : error}
        </Alert>
      </StackItem>
    )}
    <StackItem>
      <ActionList>
        <ActionListGroup>
          <ActionListItem>
            {buttonActions.map((action, index) => (
              <Button
                key={`${action.label}-${index}`}
                ref={(el) => {
                  // eslint-disable-next-line no-param-reassign
                  buttonRefs.current[index] = el;
                }}
                variant={action.variant}
                onClick={action.onClick}
                data-testid={action.dataTestId}
                isDisabled={action.isDisabled}
                isLoading={action.isLoading}
              >
                {action.label}
              </Button>
            ))}
          </ActionListItem>
        </ActionListGroup>
      </ActionList>
    </StackItem>
  </Stack>
);

export default GenericModalFooter;

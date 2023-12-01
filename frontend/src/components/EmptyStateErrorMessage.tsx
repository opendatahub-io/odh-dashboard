import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Stack,
  StackItem,
  EmptyStateHeader,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { PathMissingIcon } from '@patternfly/react-icons';

type EmptyStateErrorMessageProps = {
  children?: React.ReactNode;
  title: string;
  bodyText: string;
};

const EmptyStateErrorMessage: React.FC<EmptyStateErrorMessageProps> = ({
  title,
  bodyText,
  children,
}) => (
  <EmptyState>
    <EmptyStateHeader
      titleText={title}
      icon={<EmptyStateIcon icon={PathMissingIcon} />}
      headingLevel="h2"
    />
    <EmptyStateFooter>
      <Stack hasGutter>
        <StackItem>
          <EmptyStateBody>{bodyText}</EmptyStateBody>
        </StackItem>
        {children && <StackItem>{children}</StackItem>}
      </Stack>
    </EmptyStateFooter>
  </EmptyState>
);

export default EmptyStateErrorMessage;

import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Stack,
  StackItem,
  Title,
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
    <EmptyStateIcon icon={PathMissingIcon} />
    <Title headingLevel="h2" size="lg">
      {title}
    </Title>
    <Stack hasGutter>
      <StackItem>
        <EmptyStateBody>{bodyText}</EmptyStateBody>
      </StackItem>
      {children && <StackItem>{children}</StackItem>}
    </Stack>
  </EmptyState>
);

export default EmptyStateErrorMessage;

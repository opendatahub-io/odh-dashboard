import React from 'react';
import {
  EmptyState,
  EmptyStateVariant,
  EmptyStateIcon,
  EmptyStateBody,
  PageSection,
  PageSectionVariants,
  EmptyStateHeader,
} from '@patternfly/react-core';
import { ErrorCircleOIcon } from '@patternfly/react-icons';

type UnauthorizedErrorProps = {
  variant?: PageSectionVariants;
  titleText: string;
  error: Error;
  testId?: string;
};
const UnknownError: React.FC<UnauthorizedErrorProps> = ({
  variant = PageSectionVariants.default,
  titleText,
  error,
  testId,
}) => (
  <PageSection isFilled variant={variant} data-testid={testId}>
    <EmptyState variant={EmptyStateVariant.lg}>
      <EmptyStateHeader
        titleText={titleText}
        icon={<EmptyStateIcon icon={ErrorCircleOIcon} />}
        headingLevel="h5"
      />
      <EmptyStateBody>{error.message}</EmptyStateBody>
    </EmptyState>
  </PageSection>
);

export default UnknownError;

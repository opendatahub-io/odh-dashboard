import React from 'react';
import {
  EmptyState,
  EmptyStateVariant,
  EmptyStateBody,
  PageSection,
  PageSectionVariants,
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
  <PageSection hasBodyWrapper={false} isFilled variant={variant} data-testid={testId}>
    <EmptyState
      headingLevel="h5"
      icon={ErrorCircleOIcon}
      titleText={titleText}
      variant={EmptyStateVariant.lg}
    >
      <EmptyStateBody>{error.message}</EmptyStateBody>
    </EmptyState>
  </PageSection>
);

export default UnknownError;

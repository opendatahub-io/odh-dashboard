import React from 'react';
import {
  EmptyState,
  EmptyStateVariant,
  EmptyStateBody,
  PageSection,
  PageSectionVariants,
  Button,
  EmptyStateActions,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { LockIcon } from '@patternfly/react-icons';
import { ODH_PRODUCT_NAME } from '~/utilities/const';

type UnauthorizedErrorProps = {
  variant?: PageSectionVariants;
  accessDomain?: React.ReactNode;
};
const UnauthorizedError: React.FC<UnauthorizedErrorProps> = ({
  variant = PageSectionVariants.default,
  accessDomain = ODH_PRODUCT_NAME,
}) => (
  <PageSection hasBodyWrapper={false} isFilled variant={variant} data-testid="unauthorized-error">
    <EmptyState
      headingLevel="h5"
      icon={LockIcon}
      titleText="Access permissions needed"
      variant={EmptyStateVariant.lg}
    >
      <EmptyStateBody>
        To access {accessDomain}, ask your administrator to adjust your permissions.
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Button component="a" href="/" variant="primary">
            Return to Home
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  </PageSection>
);

export default UnauthorizedError;

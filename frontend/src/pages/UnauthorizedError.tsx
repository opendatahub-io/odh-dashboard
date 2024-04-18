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
  <PageSection isFilled variant={variant} data-testid="unauthorized-error">
    <EmptyState variant={EmptyStateVariant.lg}>
      <EmptyStateHeader
        titleText="Access permissions needed"
        icon={<EmptyStateIcon icon={LockIcon} />}
        headingLevel="h5"
      />
      <EmptyStateBody>
        To access {accessDomain}, ask your administrator to adjust your permissions.
      </EmptyStateBody>
    </EmptyState>
  </PageSection>
);

export default UnauthorizedError;

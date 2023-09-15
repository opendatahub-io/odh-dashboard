import React from 'react';
import {
  Title,
  EmptyState,
  EmptyStateVariant,
  EmptyStateIcon,
  EmptyStateBody,
  PageSection,
  PageSectionVariants,
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
  <PageSection isFilled variant={variant}>
    <EmptyState variant={EmptyStateVariant.large}>
      <EmptyStateIcon icon={LockIcon} />

      <Title headingLevel="h5" size="lg">
        Access permissions needed
      </Title>
      <EmptyStateBody>
        To access {accessDomain}, ask your administrator to adjust your permissions.
      </EmptyStateBody>
    </EmptyState>
  </PageSection>
);

export default UnauthorizedError;

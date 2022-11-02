import React from 'react';
import {
  Title,
  EmptyState,
  EmptyStateVariant,
  EmptyStateIcon,
  EmptyStateBody,
  PageSection,
} from '@patternfly/react-core';
import { LockIcon } from '@patternfly/react-icons';
import { ODH_PRODUCT_NAME } from '../utilities/const';

const UnauthorizedError: React.FC = () => (
  <PageSection isFilled>
    <EmptyState variant={EmptyStateVariant.large}>
      <EmptyStateIcon icon={LockIcon} />

      <Title headingLevel="h5" size="lg">
        Access permissions needed
      </Title>
      <EmptyStateBody>
        To access {ODH_PRODUCT_NAME}, ask your administrator to adjust your permissions.
      </EmptyStateBody>
    </EmptyState>
  </PageSection>
);

export default UnauthorizedError;

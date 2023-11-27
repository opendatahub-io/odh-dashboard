import React from 'react';
import {
  EmptyState,
  EmptyStateVariant,
  EmptyStateIcon,
  EmptyStateBody,
  PageSection,
  EmptyStateHeader,
} from '@patternfly/react-core';
import { LockIcon } from '@patternfly/react-icons';
import { ODH_PRODUCT_NAME } from '~/utilities/const';

const UnauthorizedError: React.FC = () => (
  <PageSection isFilled>
    <EmptyState variant={EmptyStateVariant.lg}>
      <EmptyStateHeader
        titleText="Access permissions needed"
        icon={<EmptyStateIcon icon={LockIcon} />}
        headingLevel="h5"
      />
      <EmptyStateBody>
        To access {ODH_PRODUCT_NAME}, ask your administrator to adjust your permissions.
      </EmptyStateBody>
    </EmptyState>
  </PageSection>
);

export default UnauthorizedError;

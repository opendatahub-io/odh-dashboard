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
import { WarningTriangleIcon } from '@patternfly/react-icons';

const UnauthorizedError: React.FC = () => (
  <>
    <PageSection variant={PageSectionVariants.light}>
      <EmptyState variant={EmptyStateVariant.full}>
        <EmptyStateIcon icon={WarningTriangleIcon} />

        <Title headingLevel="h5" size="lg">
          Unauthorized User
        </Title>
        <EmptyStateBody>
          It looks like you have no access to this application, please contact the administrator.
        </EmptyStateBody>
      </EmptyState>
    </PageSection>
  </>
);

export default UnauthorizedError;

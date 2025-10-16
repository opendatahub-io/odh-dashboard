import React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
import WhosMyAdministrator from '@odh-dashboard/internal/components/WhosMyAdministrator';
import SupportIcon from '../icons/header-icons/SupportIcon';

interface FeatureStoreAccessDeniedProps {
  resourceType: string;
  title?: string;
  description?: string;
  testId?: string;
  projectName?: string;
  headingLevel?: 'h4' | 'h5' | 'h6';
  emptyStateVariant?: EmptyStateVariant;
}

const FeatureStoreAccessDenied: React.FC<FeatureStoreAccessDeniedProps> = ({
  projectName,
  resourceType,
  title = 'Access permissions needed',
  description,
  testId = 'feature-store-access-denied',
  headingLevel = 'h4',
  emptyStateVariant = EmptyStateVariant.lg,
}) => {
  const displayProjectName = projectName || 'project';
  const defaultDescription = `You don't have permission to access the ${displayProjectName} ${resourceType}. Contact your admin to request access.`;

  return (
    <EmptyState
      headingLevel={headingLevel}
      icon={() => <SupportIcon />}
      titleText={title}
      data-testid={testId}
      variant={emptyStateVariant}
    >
      <EmptyStateBody>{description || defaultDescription}</EmptyStateBody>
      <EmptyStateFooter>
        <WhosMyAdministrator linkTestId={`${testId}-who-is-admin-button`} />
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default FeatureStoreAccessDenied;

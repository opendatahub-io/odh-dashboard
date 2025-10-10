import React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import WhosMyAdministrator from '@odh-dashboard/internal/components/WhosMyAdministrator';
import SupportIcon from '../icons/header-icons/SupportIcon';

interface FeatureStoreAccessDeniedProps {
  resourceType: string;
  title?: string;
  description?: string;
  testId?: string;
  projectName?: string;
}

const FeatureStoreAccessDenied: React.FC<FeatureStoreAccessDeniedProps> = ({
  projectName,
  resourceType,
  title = 'Access permissions needed',
  description,
  testId = 'feature-store-access-denied',
}) => {
  const displayProjectName = projectName || 'project';
  const defaultDescription = `You don't have permission to access the ${displayProjectName} ${resourceType}. Contact your admin to request access.`;

  return (
    <EmptyState
      headingLevel="h4"
      icon={() => <SupportIcon />}
      titleText={title}
      data-testid={testId}
    >
      <EmptyStateBody>{description || defaultDescription}</EmptyStateBody>
      <EmptyStateFooter>
        <WhosMyAdministrator linkTestId={`${testId}-who-is-admin-button`} />
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default FeatureStoreAccessDenied;

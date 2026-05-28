import * as React from 'react';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';

type EmptySubscriptionsTabStateProps = {
  hasData: boolean;
  variant: 'subscription' | 'model';
};

const EmptySubscriptionsTabState: React.FC<EmptySubscriptionsTabStateProps> = ({
  hasData,
  variant,
}) => {
  if (!hasData) {
    return (
      <EmptyState
        data-testid={`empty-${variant}s`}
        headingLevel="h3"
        titleText={`No ${variant}s`}
        variant="sm"
        icon={SearchIcon}
      >
        <EmptyStateBody>
          {variant === 'subscription'
            ? 'You don\u2019t have any subscriptions yet.'
            : 'You don\u2019t have any models available yet.'}
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <EmptyState
      data-testid={`empty-${variant}s-filter`}
      headingLevel="h3"
      titleText="No results found"
      variant="sm"
      icon={SearchIcon}
    >
      <EmptyStateBody>
        {`No ${variant}s match the current filters or search criteria.`}
      </EmptyStateBody>
    </EmptyState>
  );
};

export default EmptySubscriptionsTabState;

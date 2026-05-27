import * as React from 'react';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';

type EmptySubscriptionsStateProps = {
  hasData: boolean;
  variant: 'subscription' | 'model';
};

const EmptySubscriptionsState: React.FC<EmptySubscriptionsStateProps> = ({ hasData, variant }) => {
  if (!hasData) {
    return (
      <EmptyState
        data-testid={`empty-${variant}s`}
        headingLevel="h3"
        titleText={variant === 'subscription' ? 'No subscriptions' : 'No models'}
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

  return null;
};

export default EmptySubscriptionsState;

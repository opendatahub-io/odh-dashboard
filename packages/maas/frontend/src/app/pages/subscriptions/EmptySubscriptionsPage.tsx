import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { URL_PREFIX } from '~/app/utilities/const';

type EmptySubscriptionsPageProps = {
  returnTo?: string;
};

const EmptySubscriptionsPage: React.FC<EmptySubscriptionsPageProps> = ({ returnTo }) => (
  <>
    <EmptyState
      titleText="No subscriptions"
      headingLevel="h3"
      variant="lg"
      data-testid="empty-subscriptions-page"
      icon={PlusCircleIcon}
    >
      <EmptyStateBody>
        Subscriptions define rate limits and token quotas for MaaS model access. Create a
        subscription to control how much each group can consume.
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Button
            variant="primary"
            component={(props) => (
              <Link
                {...props}
                to={`${(returnTo ?? `${URL_PREFIX}/subscriptions`).split('?')[0]}/create`}
                state={returnTo ? { returnTo } : undefined}
              />
            )}
            data-testid="create-subscription-button"
          >
            Create subscription
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  </>
);

export default EmptySubscriptionsPage;

import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { CubesIcon } from '@patternfly/react-icons';
import { URL_PREFIX } from '~/app/utilities/const';

type EmptyOverviewPageProps = {
  returnTo?: string;
};

const EmptyOverviewPage: React.FC<EmptyOverviewPageProps> = ({ returnTo }) => {
  const navState = returnTo ? { returnTo } : undefined;

  return (
    <>
      <EmptyState
        titleText="Get started with subscription management"
        headingLevel="h3"
        variant="lg"
        data-testid="empty-overview-page"
        icon={CubesIcon}
      >
        <EmptyStateBody>
          No subscriptions or authorization policies have been configured yet. Set up subscriptions
          to define rate limits and policies to control which groups can access your MaaS models.
        </EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button
              variant="primary"
              component={(props) => (
                <Link {...props} to={`${URL_PREFIX}/subscriptions/create`} state={navState} />
              )}
              data-testid="create-subscription-button"
            >
              Create subscription
            </Button>
            <Button
              variant="primary"
              component={(props) => (
                <Link {...props} to={`${URL_PREFIX}/auth-policies/create`} state={navState} />
              )}
              data-testid="create-auth-policy-button"
            >
              Create authorization policy
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </>
  );
};

export default EmptyOverviewPage;

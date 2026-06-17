import * as React from 'react';
import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
import { Button } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { URL_PREFIX } from '~/app/utilities/const';

type EmptySubscriptionsPageProps = {
  returnTo?: string;
};

const EmptySubscriptionsPage: React.FC<EmptySubscriptionsPageProps> = ({ returnTo }) => (
  <>
    <EmptyDetailsView
      title="No Subscriptions"
      description="To get started, create a subscription."
      imageAlt="create a subscription"
      createButton={
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
      }
    />
  </>
);

export default EmptySubscriptionsPage;

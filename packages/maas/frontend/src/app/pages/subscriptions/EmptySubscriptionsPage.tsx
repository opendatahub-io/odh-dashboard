import * as React from 'react';
import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
import { Button } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { URL_PREFIX } from '~/app/utilities/const';

const EmptySubscriptionsPage: React.FC = () => (
  <>
    <EmptyDetailsView
      title="No Subscriptions"
      description="To get started, create a subscription."
      imageAlt="create a subscription"
      createButton={
        <Button
          variant="primary"
          component={(props) => <Link {...props} to={`${URL_PREFIX}/subscriptions/create`} />}
          data-testid="create-subscription-button"
        >
          Create subscription
        </Button>
      }
    />
  </>
);

export default EmptySubscriptionsPage;

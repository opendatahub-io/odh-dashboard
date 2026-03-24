import * as React from 'react';
import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
import { Button } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { URL_PREFIX } from '~/app/utilities/const';

const EmptySubscriptionsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <EmptyDetailsView
        title="No Subscriptions"
        description="To get started, create a subscription."
        imageAlt="create a subscription"
        createButton={
          <Button
            variant="primary"
            onClick={() => navigate(`${URL_PREFIX}/subscriptions/create`)}
            data-testid="create-subscription-button"
          >
            Create Subscription
          </Button>
        }
      />
    </>
  );
};

export default EmptySubscriptionsPage;

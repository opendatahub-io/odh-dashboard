import * as React from 'react';
import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
import { Button } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';

const EmptyEndpointsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <EmptyDetailsView
        title="No Endpoints"
        description="To get started, create an endpoint."
        imageAlt="create an endpoint"
        createButton={
          <Button
            variant="primary"
            onClick={() => navigate('create')}
            data-testid="create-endpoint-button"
          >
            Create endpoint
          </Button>
        }
      />
    </>
  );
};

export default EmptyEndpointsPage;

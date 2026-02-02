import * as React from 'react';
import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
import { Button } from '@patternfly/react-core';
import { Link } from 'react-router-dom';

const EmptyApiKeysPage: React.FC = () => (
  <EmptyDetailsView
    title="No API keys"
    description="To get started, create an API key."
    imageAlt="create an API key"
    createButton={
      <Button
        variant="primary"
        component={(props) => <Link {...props} to="/maas/api-keys/create" />}
      >
        Create API key
      </Button>
    }
  />
);

export default EmptyApiKeysPage;

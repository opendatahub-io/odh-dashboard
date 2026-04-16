import * as React from 'react';
import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
import { Button } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { URL_PREFIX } from '~/app/utilities/const';

const EmptyAuthPoliciesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <EmptyDetailsView
        title="No Policies"
        description="To get started, create a policy."
        imageAlt="create a policy"
        createButton={
          <Button
            variant="primary"
            onClick={() => navigate(`${URL_PREFIX}/auth-policies/create`)}
            data-testid="create-auth-policy-button"
          >
            Create policy
          </Button>
        }
      />
    </>
  );
};

export default EmptyAuthPoliciesPage;

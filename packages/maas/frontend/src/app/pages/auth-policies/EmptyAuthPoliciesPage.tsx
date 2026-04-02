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
        title="No Auth Policies"
        description="To get started, create an auth policy."
        imageAlt="create an auth policy"
        createButton={
          <Button
            variant="primary"
            onClick={() => navigate(`${URL_PREFIX}/auth-policies/create`)}
            data-testid="create-auth-policy-button"
          >
            Create Auth Policy
          </Button>
        }
      />
    </>
  );
};

export default EmptyAuthPoliciesPage;

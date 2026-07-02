import * as React from 'react';
import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
import { Button } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { URL_PREFIX } from '~/app/utilities/const';

type EmptyAuthPoliciesPageProps = {
  returnTo?: string;
};

const EmptyAuthPoliciesPage: React.FC<EmptyAuthPoliciesPageProps> = ({ returnTo }) => (
  <>
    <EmptyDetailsView
      title="No Policies"
      description="To get started, create a policy."
      imageAlt="create a policy"
      createButton={
        <Button
          variant="primary"
          component={(props) => (
            <Link
              {...props}
              to={`${(returnTo ?? `${URL_PREFIX}/auth-policies`).split('?')[0]}/create`}
              state={returnTo ? { returnTo } : undefined}
            />
          )}
          data-testid="create-auth-policy-button"
        >
          Create authorization policy
        </Button>
      }
    />
  </>
);

export default EmptyAuthPoliciesPage;

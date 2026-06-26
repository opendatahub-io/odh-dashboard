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

type EmptyAuthPoliciesPageProps = {
  returnTo?: string;
};

const EmptyAuthPoliciesPage: React.FC<EmptyAuthPoliciesPageProps> = ({ returnTo }) => (
  <>
    <EmptyState
      icon={PlusCircleIcon}
      headingLevel="h3"
      variant="lg"
      data-testid="empty-auth-policies-page"
      titleText="No authorization policies"
    >
      <EmptyStateBody>
        Authorization policies control which groups have access to MaaS models. Create a policy to
        define who can consume specific models.
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
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
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  </>
);

export default EmptyAuthPoliciesPage;

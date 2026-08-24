import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { useMaaSGovernanceContext } from '~/app/context/MaaSGovernanceContext';
import {
  getBackUrl,
  getBreadcrumbLabelFromState,
  getPreSelectedModelFromState,
} from '~/app/utilities/subscriptionManagementNavigation';
import PolicyForm from './policyForm/PolicyForm';

const CreateAuthPolicyPage: React.FC = () => {
  const {
    groups,
    modelRefs,
    subscriptions,
    policies,
    loaded,
    error: loadError,
  } = useMaaSGovernanceContext();
  const { state } = useLocation();
  const backUrl = getBackUrl(state, 'auth-policies');
  const returnTo = backUrl;
  const breadcrumbLabel = getBreadcrumbLabelFromState(state) ?? 'Authorization policies';
  const preSelectedModel = getPreSelectedModelFromState(state);

  return (
    <ApplicationsPage
      title="Create authorization policy"
      description="Create a new authorization policy to control which groups can access AI model endpoints."
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => (
              <Link to={backUrl} data-testid="breadcrumb-policies-link">
                {breadcrumbLabel}
              </Link>
            )}
          />
          <BreadcrumbItem isActive>Create authorization policy</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={loaded || !!loadError}
      empty={false}
      loadError={loadError}
    >
      <PolicyForm
        groups={groups}
        modelRefs={modelRefs}
        subscriptions={subscriptions}
        policies={policies}
        returnTo={returnTo}
        preSelectedModel={preSelectedModel}
      />
    </ApplicationsPage>
  );
};

export default CreateAuthPolicyPage;

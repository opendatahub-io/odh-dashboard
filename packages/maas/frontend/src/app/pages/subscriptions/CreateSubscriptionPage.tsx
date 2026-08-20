import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import {
  getBackUrl,
  getBreadcrumbLabelFromState,
  getPreSelectedModelFromState,
} from '~/app/utilities/subscriptionManagementNavigation';
import { useMaaSGovernanceContext } from '~/app/context/MaaSGovernanceContext';
import CreateSubscriptionForm from './createSubscription/CreateSubscriptionForm';

const CreateSubscriptionPage: React.FC = () => {
  const { groups, modelRefs, subscriptions, policies, loaded, error } = useMaaSGovernanceContext();
  const { state } = useLocation();
  const backUrl = getBackUrl(state, 'subscriptions');
  const returnTo = backUrl;
  const breadcrumbLabel = getBreadcrumbLabelFromState(state) ?? 'Subscriptions';
  const preSelectedModel = getPreSelectedModelFromState(state);

  return (
    <ApplicationsPage
      title="Create subscription"
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => (
              <Link to={backUrl} data-testid="breadcrumb-subscriptions-link">
                {breadcrumbLabel}
              </Link>
            )}
          />
          <BreadcrumbItem isActive>Create subscription</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={loaded || !!error}
      empty={false}
      loadError={error}
    >
      <CreateSubscriptionForm
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

export default CreateSubscriptionPage;

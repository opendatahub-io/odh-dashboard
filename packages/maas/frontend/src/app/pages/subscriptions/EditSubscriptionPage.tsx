import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import {
  getBackUrl,
  getSubscriptionViewUrl,
} from '~/app/utilities/subscriptionManagementNavigation';
import { useGetSubscriptionInfo } from '~/app/hooks/useGetSubscriptionInfo';
import { useMaaSGovernanceContext } from '~/app/context/MaaSGovernanceContext';
import CreateSubscriptionForm from './createSubscription/CreateSubscriptionForm';

const EditSubscriptionPage: React.FC = () => {
  const { subscriptionName = '' } = useParams<{ subscriptionName: string }>();
  const { state } = useLocation();
  const base = getBackUrl(state, 'subscriptions');
  const returnTo = base;
  const [subscriptionInfo, infoLoaded, infoError] = useGetSubscriptionInfo(subscriptionName);
  const {
    groups,
    modelRefs,
    subscriptions,
    policies,
    loaded: formLoaded,
    error: formError,
  } = useMaaSGovernanceContext();

  const loaded = infoLoaded && formLoaded;
  const error = infoError || formError;
  const displayName =
    subscriptionInfo?.subscription.displayName ||
    subscriptionInfo?.subscription.name ||
    subscriptionName;

  return (
    <ApplicationsPage
      title="Edit subscription"
      description={
        displayName
          ? `Edit the subscription configuration for ${displayName}.`
          : 'Edit the subscription configuration.'
      }
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to={base}>Subscriptions</Link>} />
          <BreadcrumbItem
            render={() => (
              <Link
                to={getSubscriptionViewUrl(subscriptionName)}
                state={returnTo ? { returnTo } : undefined}
              >
                {displayName || subscriptionName}
              </Link>
            )}
          />
          <BreadcrumbItem isActive>Edit subscription</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={loaded || !!error}
      empty={false}
      loadError={error}
      errorMessage="Unable to load subscription details."
    >
      {subscriptionInfo && (
        <CreateSubscriptionForm
          groups={groups}
          modelRefs={modelRefs}
          subscriptions={subscriptions}
          policies={policies}
          subscriptionInfo={subscriptionInfo}
          returnTo={returnTo}
        />
      )}
    </ApplicationsPage>
  );
};

export default EditSubscriptionPage;

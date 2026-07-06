import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { getBackUrl } from '~/app/utilities/subscriptionManagementNavigation';
import { useGetSubscriptionInfo } from '~/app/hooks/useGetSubscriptionInfo';
import { useSubscriptionPolicyFormData } from '~/app/hooks/useSubscriptionPolicyFormData';
import CreateSubscriptionForm from './createSubscription/CreateSubscriptionForm';

const EditSubscriptionPage: React.FC = () => {
  const { subscriptionName = '' } = useParams<{ subscriptionName: string }>();
  const { state, pathname } = useLocation();
  const base = getBackUrl(pathname, state, 'subscriptions');
  const returnTo = base;
  const [subscriptionInfo, infoLoaded, infoError] = useGetSubscriptionInfo(subscriptionName);
  const [formData, formLoaded, formError] = useSubscriptionPolicyFormData();

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
                to={`${base}/view/${subscriptionName}`}
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
          formData={formData}
          subscriptionInfo={subscriptionInfo}
          returnTo={returnTo}
        />
      )}
    </ApplicationsPage>
  );
};

export default EditSubscriptionPage;

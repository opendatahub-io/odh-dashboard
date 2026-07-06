import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { getBackUrl } from '~/app/utilities/subscriptionManagementNavigation';
import { useSubscriptionPolicyFormData } from '~/app/hooks/useSubscriptionPolicyFormData';
import CreateSubscriptionForm from './createSubscription/CreateSubscriptionForm';

const CreateSubscriptionPage: React.FC = () => {
  const [formData, loaded, error] = useSubscriptionPolicyFormData();
  const { state, pathname } = useLocation();
  const backUrl = getBackUrl(pathname, state, 'subscriptions');
  const returnTo = backUrl;

  return (
    <ApplicationsPage
      title="Create subscription"
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to={backUrl}>Subscriptions</Link>} />
          <BreadcrumbItem isActive>Create subscription</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={loaded || !!error}
      empty={false}
      loadError={error}
    >
      <CreateSubscriptionForm formData={formData} returnTo={returnTo} />
    </ApplicationsPage>
  );
};

export default CreateSubscriptionPage;

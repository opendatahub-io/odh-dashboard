import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { URL_PREFIX } from '~/app/utilities/const';
import { getReturnToFromState } from '~/app/utilities/subscriptionManagementNavigation';
import { useSubscriptionPolicyFormData } from '~/app/hooks/useSubscriptionPolicyFormData';
import CreateSubscriptionForm from './createSubscription/CreateSubscriptionForm';

const CreateSubscriptionPage: React.FC = () => {
  const [formData, loaded, error] = useSubscriptionPolicyFormData();
  const { state } = useLocation();
  const returnTo = getReturnToFromState(state);
  const backUrl = returnTo ?? `${URL_PREFIX}/subscriptions`;

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

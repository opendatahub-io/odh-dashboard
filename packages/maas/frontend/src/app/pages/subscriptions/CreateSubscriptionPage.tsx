import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import {
  getBackUrl,
  getBreadcrumbLabelFromState,
  getPreSelectedModelFromState,
} from '~/app/utilities/subscriptionManagementNavigation';
import { useSubscriptionPolicyFormData } from '~/app/hooks/useSubscriptionPolicyFormData';
import CreateSubscriptionForm from './createSubscription/CreateSubscriptionForm';

const CreateSubscriptionPage: React.FC = () => {
  const [formData, loaded, error] = useSubscriptionPolicyFormData();
  const { state, pathname } = useLocation();
  const backUrl = getBackUrl(pathname, state, 'subscriptions');
  const returnTo = backUrl;
  const breadcrumbLabel = getBreadcrumbLabelFromState(state) ?? 'Subscriptions';
  const preSelectedModel = getPreSelectedModelFromState(state);

  return (
    <ApplicationsPage
      title="Create subscription"
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to={backUrl}>{breadcrumbLabel}</Link>} />
          <BreadcrumbItem isActive>Create subscription</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={loaded || !!error}
      empty={false}
      loadError={error}
    >
      <CreateSubscriptionForm
        formData={formData}
        returnTo={returnTo}
        preSelectedModel={preSelectedModel}
      />
    </ApplicationsPage>
  );
};

export default CreateSubscriptionPage;

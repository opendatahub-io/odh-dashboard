import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { useSubscriptionPolicyFormData } from '~/app/hooks/useSubscriptionPolicyFormData';
import { getBackUrl } from '~/app/utilities/subscriptionManagementNavigation';
import PolicyForm from './policyForm/PolicyForm';

const CreateAuthPolicyPage: React.FC = () => {
  const [formData, loaded, loadError] = useSubscriptionPolicyFormData();
  const { state, pathname } = useLocation();
  const backUrl = getBackUrl(pathname, state, 'auth-policies');
  const returnTo = backUrl;

  return (
    <ApplicationsPage
      title="Create authorization policy"
      description="Create a new authorization policy to control which groups can access AI model endpoints."
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to={backUrl}>Authorization policies</Link>} />
          <BreadcrumbItem isActive>Create authorization policy</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={loaded || !!loadError}
      empty={false}
      loadError={loadError}
    >
      <PolicyForm formData={formData} returnTo={returnTo} />
    </ApplicationsPage>
  );
};

export default CreateAuthPolicyPage;

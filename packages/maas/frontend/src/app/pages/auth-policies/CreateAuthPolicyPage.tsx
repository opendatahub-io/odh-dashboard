import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { useSubscriptionPolicyFormData } from '~/app/hooks/useSubscriptionPolicyFormData';
import { URL_PREFIX } from '~/app/utilities/const';
import PolicyForm from './policyForm/PolicyForm';

const CreateAuthPolicyPage: React.FC = () => {
  const [formData, loaded, loadError] = useSubscriptionPolicyFormData();
  const { state } = useLocation();
  const returnTo =
    state != null &&
    typeof state === 'object' &&
    'returnTo' in state &&
    typeof state.returnTo === 'string'
      ? state.returnTo
      : undefined;
  const backUrl = returnTo ?? `${URL_PREFIX}/auth-policies`;

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

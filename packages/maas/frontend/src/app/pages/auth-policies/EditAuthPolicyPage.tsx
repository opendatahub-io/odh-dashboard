import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { useGetPolicyInfo } from '~/app/hooks/useGetPolicyInfo';
import { useSubscriptionPolicyFormData } from '~/app/hooks/useSubscriptionPolicyFormData';
import { getBackUrl } from '~/app/utilities/subscriptionManagementNavigation';
import PolicyForm from './policyForm/PolicyForm';

const EditAuthPolicyPage: React.FC = () => {
  const { authPolicyName = '' } = useParams<{ authPolicyName: string }>();
  const { state, pathname } = useLocation();
  const base = getBackUrl(pathname, state, 'auth-policies');
  const returnTo = base;
  const [policyInfo, policyLoaded, policyError] = useGetPolicyInfo(authPolicyName);
  const [formData, formLoaded, formError] = useSubscriptionPolicyFormData();

  const loaded = policyLoaded && formLoaded;
  const loadError = policyError ?? formError;
  const displayName = policyInfo?.policy.displayName || policyInfo?.policy.name || authPolicyName;

  return (
    <ApplicationsPage
      title="Edit authorization policy"
      description="Update groups, models, and metadata for this authorization policy."
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to={base}>Authorization policies</Link>} />
          <BreadcrumbItem isActive>{displayName || authPolicyName}</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={loaded || !!loadError}
      empty={false}
      loadError={loadError}
      errorMessage="Unable to load policy."
    >
      {policyInfo && (
        <PolicyForm
          key={policyInfo.policy.name}
          formData={formData}
          initialPolicy={policyInfo.policy}
          returnTo={returnTo}
        />
      )}
    </ApplicationsPage>
  );
};

export default EditAuthPolicyPage;

import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { useGetPolicyInfo } from '~/app/hooks/useGetPolicyInfo';
import { useSubscriptionPolicyFormData } from '~/app/hooks/useSubscriptionPolicyFormData';
import { URL_PREFIX } from '~/app/utilities/const';
import PolicyForm from './policyForm/PolicyForm';

const EditAuthPolicyPage: React.FC = () => {
  const { authPolicyName = '' } = useParams<{ authPolicyName: string }>();
  const [policyInfo, policyLoaded, policyError] = useGetPolicyInfo(authPolicyName);
  const [formData, formLoaded, formError] = useSubscriptionPolicyFormData();

  const loaded = policyLoaded && formLoaded;
  const loadError = policyError ?? formError;
  const displayName = policyInfo?.policy.displayName || policyInfo?.policy.name || authPolicyName;

  return (
    <ApplicationsPage
      title="Edit policy"
      description="Update groups, models, and metadata for this authorization policy."
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to={`${URL_PREFIX}/auth-policies`}>Policies</Link>} />
          <BreadcrumbItem isActive>{displayName || authPolicyName}</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={loaded}
      empty={false}
      loadError={loadError}
      errorMessage="Unable to load policy."
    >
      {policyInfo && (
        <PolicyForm
          key={policyInfo.policy.name}
          formData={formData}
          initialPolicy={policyInfo.policy}
        />
      )}
    </ApplicationsPage>
  );
};

export default EditAuthPolicyPage;

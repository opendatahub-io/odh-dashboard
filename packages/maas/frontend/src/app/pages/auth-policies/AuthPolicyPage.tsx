import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { useGetPolicyInfo } from '~/app/hooks/useGetPolicyInfo';
import { useSubscriptionPolicyFormData } from '~/app/hooks/useSubscriptionPolicyFormData';
import { URL_PREFIX } from '~/app/utilities/const';
import PolicyForm from './policyForm/PolicyForm';

const AuthPolicyPage: React.FC = () => {
  const { authPolicyName = '' } = useParams<{ authPolicyName?: string }>();
  const isEdit = !!authPolicyName;

  const [formData, formLoaded, formError] = useSubscriptionPolicyFormData();
  const [policyInfo, policyLoaded, policyError] = useGetPolicyInfo(authPolicyName);

  const loaded = isEdit ? formLoaded && policyLoaded : formLoaded;
  const loadError = isEdit ? (policyError ?? formError) : formError;

  return (
    <ApplicationsPage
      title={isEdit ? 'Edit policy' : 'Create policy'}
      description={
        isEdit
          ? 'Update groups, models, and metadata for this authorization policy.'
          : 'Create a new authorization policy to control which groups and users can access AI model endpoints.'
      }
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to={`${URL_PREFIX}/auth-policies`}>Policies</Link>} />
          <BreadcrumbItem isActive>{isEdit ? authPolicyName : 'Create policy'}</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={loaded}
      empty={false}
      loadError={loadError}
      errorMessage={isEdit ? 'Unable to load policy.' : undefined}
    >
      {loaded && (!isEdit || !!policyInfo) && (
        <PolicyForm
          key={policyInfo?.policy.name}
          mode={isEdit ? 'edit' : 'create'}
          formData={formData}
          initialPolicy={policyInfo?.policy}
        />
      )}
    </ApplicationsPage>
  );
};

export default AuthPolicyPage;

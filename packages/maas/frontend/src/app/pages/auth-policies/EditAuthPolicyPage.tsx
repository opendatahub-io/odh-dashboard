import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { useGetPolicyInfo } from '~/app/hooks/useGetPolicyInfo';
import { useMaaSGovernanceContext } from '~/app/context/MaaSGovernanceContext';
import { getBackUrl } from '~/app/utilities/subscriptionManagementNavigation';
import PolicyForm from './policyForm/PolicyForm';

const EditAuthPolicyPage: React.FC = () => {
  const { authPolicyName = '' } = useParams<{ authPolicyName: string }>();
  const { state } = useLocation();
  const base = getBackUrl(state, 'auth-policies');
  const returnTo = base;
  const [policyInfo, policyLoaded, policyError] = useGetPolicyInfo(authPolicyName);
  const {
    groups,
    modelRefs,
    subscriptions,
    policies,
    loaded: formLoaded,
    error: formError,
  } = useMaaSGovernanceContext();

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
          groups={groups}
          modelRefs={modelRefs}
          subscriptions={subscriptions}
          policies={policies}
          initialPolicy={policyInfo.policy}
          returnTo={returnTo}
        />
      )}
    </ApplicationsPage>
  );
};

export default EditAuthPolicyPage;

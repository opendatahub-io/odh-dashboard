import React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { useGetPolicyInfo } from '~/app/hooks/useGetPolicyInfo';
import { useSubscriptionPolicyFormData } from '~/app/hooks/useSubscriptionPolicyFormData';
import { URL_PREFIX } from '~/app/utilities/const';
import PolicyForm from './policyForm/PolicyForm';

const PolicyNotFound: React.FC<{ name: string }> = ({ name }) => (
  <Bullseye>
    <EmptyState headingLevel="h4" icon={ExclamationCircleIcon} titleText="Policy not found">
      <EmptyStateBody>
        We were unable to find a policy named <strong>{name}</strong>
      </EmptyStateBody>
      <EmptyStateFooter>
        <Button
          variant="primary"
          component={(props: React.ComponentProps<'a'>) => (
            <Link {...props} to={`${URL_PREFIX}/auth-policies`} />
          )}
        >
          Return to Policies
        </Button>
      </EmptyStateFooter>
    </EmptyState>
  </Bullseye>
);

const AuthPolicyPage: React.FC = () => {
  const { authPolicyName } = useParams<{ authPolicyName?: string }>();
  const isEdit = !!authPolicyName;
  const decodedAuthPolicyName = authPolicyName ? decodeURIComponent(authPolicyName) : '';

  const [formData, formLoaded, formError] = useSubscriptionPolicyFormData();
  const [policyInfo, policyLoaded, policyError] = useGetPolicyInfo(decodedAuthPolicyName);

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
          <BreadcrumbItem isActive>
            {isEdit ? decodedAuthPolicyName : 'Create policy'}
          </BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={loaded}
      empty={false}
      loadError={loadError}
      errorMessage={isEdit ? 'Unable to load policy.' : undefined}
    >
      {isEdit && loaded && !policyInfo && <PolicyNotFound name={decodedAuthPolicyName} />}
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

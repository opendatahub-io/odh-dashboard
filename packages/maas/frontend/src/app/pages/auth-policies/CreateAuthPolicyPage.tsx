import React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { useSubscriptionPolicyFormData } from '~/app/hooks/useSubscriptionPolicyFormData';
import { URL_PREFIX } from '~/app/utilities/const';
import PolicyForm from './policyForm/PolicyForm';

const CreateAuthPolicyPage: React.FC = () => {
  const [formData, loaded, loadError] = useSubscriptionPolicyFormData();

  return (
    <ApplicationsPage
      title="Create policy"
      description="Create a new authorization policy to control which groups can access AI model endpoints."
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to={`${URL_PREFIX}/auth-policies`}>Policies</Link>} />
          <BreadcrumbItem isActive>Create policy</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={loaded}
      empty={false}
      loadError={loadError}
    >
      <PolicyForm formData={formData} />
    </ApplicationsPage>
  );
};

export default CreateAuthPolicyPage;

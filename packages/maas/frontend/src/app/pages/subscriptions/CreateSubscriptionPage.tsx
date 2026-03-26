import React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { URL_PREFIX } from '~/app/utilities/const';
import { useSubscriptionFormData } from '~/app/hooks/useSubscriptionFormData';
import CreateSubscriptionForm from './createSubscription/CreateSubscriptionForm';

const CreateSubscriptionPage: React.FC = () => {
  const [formData, loaded, error] = useSubscriptionFormData();

  return (
    <ApplicationsPage
      title="Create subscription"
      description="Create a new subscription to control access and entitlements to AI model endpoints."
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to={`${URL_PREFIX}/subscriptions`}>Subscriptions</Link>}
          />
          <BreadcrumbItem isActive>Create subscription</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={loaded}
      empty={false}
      loadError={error}
    >
      <CreateSubscriptionForm formData={formData} />
    </ApplicationsPage>
  );
};

export default CreateSubscriptionPage;

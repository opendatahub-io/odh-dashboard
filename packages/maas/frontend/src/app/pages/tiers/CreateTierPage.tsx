import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import React from 'react';
import { Breadcrumb, BreadcrumbItem, PageSection } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import CreateTierForm from './createTier/CreateTierForm';

const CreateTierPage: React.FC = () => (
  <ApplicationsPage
    title="Create tier"
    description="Create a new tier to control which models users can access based on their group membership."
    empty={false}
    loaded
    breadcrumb={
      <Breadcrumb>
        <BreadcrumbItem render={() => <Link to="/maas/tiers">Tiers</Link>} />
        <BreadcrumbItem isActive>Create tier</BreadcrumbItem>
      </Breadcrumb>
    }
    data-testid="create-tier-page"
  >
    <PageSection isFilled>
      <CreateTierForm />
    </PageSection>
  </ApplicationsPage>
);

export default CreateTierPage;

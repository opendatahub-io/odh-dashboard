import React from 'react';
import { Breadcrumb, BreadcrumbItem, PageSection } from '@patternfly/react-core';
import { Link, useLocation } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import CreateTierForm from './createTier/CreateTierForm';

const EditTierPage: React.FC = () => {
  const location = useLocation();
  const tier = location.state?.tier;
  return (
    <ApplicationsPage
      title="Edit tier"
      description="Edit a tier to control which models users can access based on their group membership."
      empty={false}
      loaded
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to="/maas/tiers">Tiers</Link>} />
          <BreadcrumbItem isActive>Edit tier</BreadcrumbItem>
        </Breadcrumb>
      }
      data-testid="edit-tier-page"
    >
      <PageSection isFilled>
        <CreateTierForm tier={tier} />
      </PageSection>
    </ApplicationsPage>
  );
};

export default EditTierPage;

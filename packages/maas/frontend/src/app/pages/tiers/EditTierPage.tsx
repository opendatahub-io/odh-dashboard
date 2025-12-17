import React from 'react';
import { Breadcrumb, BreadcrumbItem, PageSection } from '@patternfly/react-core';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { Tier } from '~/app/types/tier';
import useUpdateTier from '~/app/hooks/useUpdateTier';
import CreateTierForm from './createTier/CreateTierForm';

const EditTierPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const tier = location.state?.tier;
  const { isUpdating, error, updateTierCallback } = useUpdateTier();

  const handleSubmit = async (updatingTier: Tier): Promise<void> => {
    try {
      await updateTierCallback(updatingTier);
      navigate('/maas/tiers');
    } catch {
      // Error is already set in the hook, just don't navigate
    }
  };
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
        <CreateTierForm
          tier={tier}
          onSubmit={handleSubmit}
          isSubmitting={isUpdating}
          submitError={error}
        />
      </PageSection>
    </ApplicationsPage>
  );
};

export default EditTierPage;

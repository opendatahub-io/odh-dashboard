import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import React from 'react';
import { Breadcrumb, BreadcrumbItem, PageSection } from '@patternfly/react-core';
import { Link, useNavigate } from 'react-router-dom';
import useCreateTier from '~/app/hooks/useCreateTier';
import { Tier } from '~/app/types/tier';
import { useFetchTiers } from '~/app/hooks/useFetchTiers';
import CreateTierForm from './createTier/CreateTierForm';

const CreateTierPage: React.FC = () => {
  const navigate = useNavigate();
  const { isCreating, error, createTierCallback } = useCreateTier();

  const [tiers, loaded, fetchTiersError] = useFetchTiers();

  const handleSubmit = async (tier: Tier): Promise<void> => {
    try {
      await createTierCallback(tier);
      navigate('/maas/tiers');
    } catch {
      // Error is already set in the hook, just don't navigate
    }
  };

  return (
    <ApplicationsPage
      title="Create tier"
      description="Create a new tier to control which models users can access based on their group membership."
      empty={false}
      loaded={loaded}
      loadError={fetchTiersError}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to="/maas/tiers">Tiers</Link>} />
          <BreadcrumbItem isActive>Create tier</BreadcrumbItem>
        </Breadcrumb>
      }
      data-testid="create-tier-page"
    >
      <PageSection isFilled>
        <CreateTierForm
          onSubmit={handleSubmit}
          isSubmitting={isCreating}
          submitError={error}
          allTiers={tiers}
        />
      </PageSection>
    </ApplicationsPage>
  );
};

export default CreateTierPage;

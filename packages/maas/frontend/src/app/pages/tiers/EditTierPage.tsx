import React from 'react';
import { Breadcrumb, BreadcrumbItem, PageSection } from '@patternfly/react-core';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import NotFound from '@odh-dashboard/internal/pages/NotFound';
import { Tier } from '~/app/types/tier';
import useUpdateTier from '~/app/hooks/useUpdateTier';
import { useFetchTiers } from '~/app/hooks/useFetchTiers';
import CreateTierForm from './createTier/CreateTierForm';

const EditTierPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [tiers, loaded, fetchTiersError] = useFetchTiers();
  const { tierName } = useParams<{ tierName: string }>();
  const paramTier = tiers.find((t: Tier) => t.name === tierName);

  const editTier = React.useMemo<Tier | undefined>(
    () => location.state?.tier ?? paramTier ?? undefined,
    [location.state?.tier, paramTier],
  );
  const tierNotFound = React.useMemo(
    () => !paramTier && !location.state?.tier && loaded,
    [paramTier, location.state?.tier, loaded],
  );

  const { isUpdating, error, updateTierCallback } = useUpdateTier();

  if (tierNotFound) {
    return <NotFound />;
  }

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
      loaded={loaded}
      loadError={fetchTiersError}
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
          tier={editTier}
          onSubmit={handleSubmit}
          isSubmitting={isUpdating}
          submitError={error}
        />
      </PageSection>
    </ApplicationsPage>
  );
};

export default EditTierPage;

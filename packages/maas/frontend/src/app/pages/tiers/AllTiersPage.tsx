import * as React from 'react';
import { PageSection } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { useFetchTiers } from '~/app/hooks/useFetchTiers';
import { Tier } from '~/app/types/tier';
import TiersTable from './allTiers/TiersTable';
import DeleteTierModal from './components/DeleteTierModal';

const AllTiersPage: React.FC = () => {
  const [tiers, loaded, error, refresh] = useFetchTiers();

  const [deleteTier, setDeleteTier] = React.useState<Tier | undefined>(undefined);

  return (
    <ApplicationsPage
      title="Tiers"
      description="Tiers control which AI asset model endpoints users can access based on their group membership."
      loaded={loaded}
      loadError={error}
      empty={loaded && !tiers.length}
    >
      <PageSection isFilled>
        <TiersTable tiers={tiers} onDeleteTier={(tier) => setDeleteTier(tier)} />
      </PageSection>
      {deleteTier && deleteTier.name && (
        <DeleteTierModal
          tier={deleteTier}
          onClose={(deleted) => {
            setDeleteTier(undefined);
            if (deleted) {
              refresh();
            }
          }}
        />
      )}
    </ApplicationsPage>
  );
};

export default AllTiersPage;

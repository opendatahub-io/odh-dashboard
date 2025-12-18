import * as React from 'react';
import { PageSection } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { useTiers } from '~/app/api/tiers';
import { Tier } from '~/app/types/tier';
import TiersTable from './allTiers/TiersTable';
import DeleteTierModal from './components/DeleteTierModal';

const AllTiersPage: React.FC = () => {
  const tiers = useTiers();
  const [deleteTier, setDeleteTier] = React.useState<Tier | undefined>(undefined);

  return (
    <ApplicationsPage
      title="Tiers"
      description="Tiers control which AI asset model endpoints users can access based on their group membership."
      loaded
      empty={false}
    >
      <PageSection isFilled>
        <TiersTable tiers={tiers} onDeleteTier={(tier) => setDeleteTier(tier)} />
      </PageSection>
      {deleteTier && (
        <DeleteTierModal
          tier={deleteTier}
          onClose={() => {
            setDeleteTier(undefined);
          }}
        />
      )}
    </ApplicationsPage>
  );
};

export default AllTiersPage;

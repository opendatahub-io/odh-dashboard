import * as React from 'react';
import { PageSection } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { useTiers } from '~/app/api/tiers';
import TiersTable from './allTiers/TiersTable';

const AllTiersPage: React.FC = () => {
  const tiers = useTiers();
  return (
    <ApplicationsPage
      title="Tiers"
      description="Tiers control which AI asset model endpoints users can access based on their group membership."
      loaded
      empty={false}
    >
      <PageSection isFilled>
        <TiersTable tiers={tiers} />
      </PageSection>
    </ApplicationsPage>
  );
};

export default AllTiersPage;

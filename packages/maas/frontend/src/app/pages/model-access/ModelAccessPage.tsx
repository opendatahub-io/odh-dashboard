import * as React from 'react';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { MaaSGovernanceProvider } from '~/app/context/MaaSGovernanceContext';
import SubscriptionsTab from '~/app/pages/maas-governance/SubscriptionsTab';

/**
 * Read-only model access viewer.
 *
 * Reuses the MaaS governance subscriptions tab (and therefore its table with the
 * Groups and Models expandable sub-tables) with `readOnly` set, which drops the
 * Status column, the row kebab, the create button, and the delete modal. Its data
 * comes from the dedicated `admin-subscriptions` endpoint.
 *
 * `subscriptionsOnly` keeps the page off Kubernetes: the provider does not fetch
 * auth policies, model refs, or groups, none of which this page renders.
 *
 * The tab owns its own loading, error, and empty states.
 */
const ModelAccessPageContent: React.FC = () => (
  <ApplicationsPage
    title="Model Access"
    description="Manage subscriptions that control access to models through the Models-as-a-Server (MaaS) gateway."
    loaded
    empty={false}
  >
    <SubscriptionsTab readOnly />
  </ApplicationsPage>
);

const ModelAccessPage: React.FC = () => (
  <MaaSGovernanceProvider subscriptionsEndpoint="admin-subscriptions" subscriptionsOnly>
    <ModelAccessPageContent />
  </MaaSGovernanceProvider>
);

export default ModelAccessPage;

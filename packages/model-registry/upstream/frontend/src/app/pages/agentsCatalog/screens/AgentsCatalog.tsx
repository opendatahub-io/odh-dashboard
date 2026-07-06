import * as React from 'react';
import { ApplicationsPage } from 'mod-arch-shared';
import { AGENTS_CATALOG_TITLE, AGENTS_CATALOG_DESCRIPTION } from '~/app/pages/agentsCatalog/const';

// ponytail: no agent-specific ProjectObjectType exists yet — add TitleWithIcon when one is available
const AgentsCatalog: React.FC = () => (
  <ApplicationsPage
    title={AGENTS_CATALOG_TITLE}
    description={AGENTS_CATALOG_DESCRIPTION}
    empty={false}
    loaded
    provideChildrenPadding
  >
    Agents catalog coming soon
  </ApplicationsPage>
);

export default AgentsCatalog;

import * as React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';
import { ApplicationsPage } from 'mod-arch-shared';
import { AGENTS_CATALOG_TITLE, AGENTS_CATALOG_DESCRIPTION } from '~/app/pages/agentsCatalog/const';
import AgentsCatalogIcon from '~/app/pages/agentsCatalog/AgentsCatalogIcon';

// ponytail: inline TitleWithIcon — no ProjectObjectType for agents in mod-arch-shared yet
const ICON_SIZE = 40;
const ICON_PADDING = 4;

const AgentsCatalogTitle: React.FC = () => (
  <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
    <FlexItem>
      <div
        style={{
          background: 'var(--pf-t--global--color--nonstatus--purple--default)',
          borderRadius: ICON_SIZE / 2,
          padding: ICON_PADDING,
          width: ICON_SIZE,
          height: ICON_SIZE,
        }}
      >
        <AgentsCatalogIcon
          color="black"
          style={{
            width: ICON_SIZE - ICON_PADDING * 2,
            height: ICON_SIZE - ICON_PADDING * 2,
          }}
        />
      </div>
    </FlexItem>
    <FlexItem>{AGENTS_CATALOG_TITLE}</FlexItem>
  </Flex>
);

const AgentsCatalog: React.FC = () => (
  <ApplicationsPage
    title={<AgentsCatalogTitle />}
    description={AGENTS_CATALOG_DESCRIPTION}
    empty={false}
    loaded
    provideChildrenPadding
  >
    Agents catalog coming soon
  </ApplicationsPage>
);

export default AgentsCatalog;

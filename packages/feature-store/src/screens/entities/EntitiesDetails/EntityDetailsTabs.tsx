import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import * as React from 'react';
import EntityDetailsView from './EntityDetailsView';
import { Entity } from '../../../types/entities';
import FeatureViewTab from '../../components/FeatureViewTab';
import { EntityDetailsTab } from '../const';

type EntityDetailsTabsProps = {
  entity: Entity;
};

const EntityDetailsTabs: React.FC<EntityDetailsTabsProps> = ({ entity }) => {
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(EntityDetailsTab.DETAILS);

  return (
    <Tabs
      activeKey={activeTabKey}
      aria-label="Entity details page"
      role="region"
      data-testid="entity-details-page"
      onSelect={(e, tabIndex) => {
        setActiveTabKey(tabIndex);
      }}
    >
      <Tab
        eventKey={EntityDetailsTab.DETAILS}
        title={<TabTitleText>{EntityDetailsTab.DETAILS}</TabTitleText>}
        aria-label="Entity details tab"
        data-testid="entity-details-tab"
      >
        <PageSection hasBodyWrapper={false} isFilled data-testid="entity-details-tab-content">
          <EntityDetailsView entity={entity} />
        </PageSection>
      </Tab>
      <Tab
        eventKey={EntityDetailsTab.FEATURE_VIEWS}
        title={<TabTitleText>{EntityDetailsTab.FEATURE_VIEWS}</TabTitleText>}
        aria-label="Entity feature views tab"
        data-testid="entity-feature-views-tab"
      >
        <PageSection
          hasBodyWrapper={false}
          isFilled
          data-testid="entity-feature-views-tab-content"
          className="pf-v6-u-mt-xl"
        >
          <FeatureViewTab fsObject={{ entity: entity.spec.name }} contextName="entity" />
        </PageSection>
      </Tab>
    </Tabs>
  );
};

export default EntityDetailsTabs;

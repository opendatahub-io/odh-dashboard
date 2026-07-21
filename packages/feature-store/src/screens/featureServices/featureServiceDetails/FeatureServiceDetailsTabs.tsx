import { PageSection, Tab, TabContentBody, Tabs, TabTitleText } from '@patternfly/react-core';
import * as React from 'react';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import FeatureServiceDetailsPage from './FeatureServiceDetailsPage';
import { FeatureService } from '../../../types/featureServices';
import FeatureViewTab from '../../components/FeatureViewTab';
import { FeatureServiceDetailsTab } from '../const';
import {
  FEATURE_STORE_EVENTS,
  RESOURCE_TYPES,
  TabSwitchedProperties,
} from '../../../tracking/featureStoreTrackingConstants';

type FeatureServiceDetailsTabsProps = {
  featureService: FeatureService;
  fsProject?: string;
};

const FeatureServiceDetailsTabs: React.FC<FeatureServiceDetailsTabsProps> = ({
  featureService,
  fsProject,
}) => {
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(
    FeatureServiceDetailsTab.DETAILS,
  );

  return (
    <Tabs
      activeKey={activeTabKey}
      aria-label="Feature service details page"
      role="region"
      data-testid="feature-service-details-tabs"
      onSelect={(e, tabIndex) => {
        if (tabIndex !== activeTabKey) {
          fireMiscTrackingEvent(FEATURE_STORE_EVENTS.TAB_SWITCHED, {
            tabName: String(tabIndex),
            pageType: 'detail',
            resourceType: RESOURCE_TYPES.FEATURE_SERVICE,
          } satisfies TabSwitchedProperties);
        }
        setActiveTabKey(tabIndex);
      }}
    >
      <Tab
        eventKey={FeatureServiceDetailsTab.DETAILS}
        title={<TabTitleText>{FeatureServiceDetailsTab.DETAILS}</TabTitleText>}
        aria-label="Feature service details tab"
        data-testid="feature-service-details-tab"
      >
        <TabContentBody>
          <FeatureServiceDetailsPage featureService={featureService} fsProject={fsProject} />
        </TabContentBody>
      </Tab>
      <Tab
        eventKey={FeatureServiceDetailsTab.FEATURE_VIEWS}
        title={<TabTitleText>{FeatureServiceDetailsTab.FEATURE_VIEWS}</TabTitleText>}
        aria-label="Feature views tab"
        data-testid="feature-views-tab"
      >
        <TabContentBody>
          <PageSection
            isFilled
            padding={{ default: 'noPadding' }}
            hasBodyWrapper={false}
            className="pf-v6-u-mt-xl"
          >
            <FeatureViewTab
              fsObject={{ featureService: featureService.spec.name }}
              contextName="feature service"
            />
          </PageSection>
        </TabContentBody>
      </Tab>
    </Tabs>
  );
};

export default FeatureServiceDetailsTabs;

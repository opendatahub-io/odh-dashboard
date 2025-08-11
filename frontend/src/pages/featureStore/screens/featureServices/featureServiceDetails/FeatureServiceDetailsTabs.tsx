import { PageSection, Tab, TabContentBody, Tabs, TabTitleText } from '@patternfly/react-core';
import * as React from 'react';
import { FeatureService } from '#~/pages/featureStore/types/featureServices';
import { FeatureServiceDetailsTab } from '#~/pages/featureStore/screens/featureServices/const';
import FeatureViewTab from '#~/pages/featureStore/screens/components/FeatureViewTab';
import FeatureServiceDetailsPage from './FeatureServiceDetailsPage';

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
      aria-label="Feature details page"
      role="region"
      data-testid="feature-details-page"
      onSelect={(e, tabIndex) => {
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

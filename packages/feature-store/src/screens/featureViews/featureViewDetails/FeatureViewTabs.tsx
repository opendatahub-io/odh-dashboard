import { Content, PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import * as React from 'react';
import FeatureViewLineageTab from './FeatureViewLineageTab';
import FeatureViewDetailsView from './FeatureViewDetailsTab';
import FeatureViewMaterialization from './FeatureViewMaterialization';
import FeatureViewTransformation from './FeatureViewTransformation';
import FeatureViewConsumingTab from './FeatureViewConsumingTab';
import { FeatureView } from '../../../types/featureView';
import FeatureStoreInfoTooltip from '../../components/FeatureStoreInfoTooltip';
import { FeatureViewTab } from '../const';

type FeatureViewTabsProps = {
  featureView: FeatureView;
};

const getTabTitleWithTooltip = (title: string, tooltip: string) => (
  <>
    <TabTitleText>{title}</TabTitleText>
    <FeatureStoreInfoTooltip>
      <Content component="small">{tooltip}</Content>
    </FeatureStoreInfoTooltip>
  </>
);

const FeatureViewTabs: React.FC<FeatureViewTabsProps> = ({ featureView }) => {
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(FeatureViewTab.DETAILS);

  return (
    <Tabs
      activeKey={activeTabKey}
      aria-label="Feature view details page"
      role="region"
      data-testid="feature-view-details-page"
      onSelect={(e, tabIndex) => {
        setActiveTabKey(tabIndex);
      }}
    >
      <Tab
        eventKey={FeatureViewTab.DETAILS}
        title={<TabTitleText>{FeatureViewTab.DETAILS}</TabTitleText>}
        aria-label="Feature view details tab"
        data-testid="feature-view-details-tab"
      >
        <PageSection
          hasBodyWrapper={false}
          isFilled
          data-testid="feature-view-details-tab-content"
          style={{ margin: '0' }}
        >
          <FeatureViewDetailsView featureView={featureView} />
        </PageSection>
      </Tab>
      <Tab
        eventKey={FeatureViewTab.LINEAGE}
        title={<TabTitleText>{FeatureViewTab.LINEAGE}</TabTitleText>}
        aria-label="Lineage feature views tab"
        data-testid="lineage-feature-views-tab"
      >
        <PageSection
          hasBodyWrapper={false}
          isFilled
          data-testid="lineage-feature-views-tab-content"
        >
          <FeatureViewLineageTab featureView={featureView} />
        </PageSection>
      </Tab>
      <Tab
        eventKey={FeatureViewTab.CONSUMING_SERVICES}
        title={getTabTitleWithTooltip(
          FeatureViewTab.CONSUMING_SERVICES,
          'A feature service is a logical group of features from one or more feature views.',
        )}
        aria-label="Consuming feature services tab"
        data-testid="consuming-feature-services-tab"
      >
        <PageSection
          hasBodyWrapper={false}
          isFilled
          data-testid="lineage-feature-views-tab-content"
          className="pf-v6-u-mt-xl"
        >
          <FeatureViewConsumingTab featureView={featureView} />
        </PageSection>
      </Tab>
      <Tab
        eventKey={FeatureViewTab.MATERIALIZATION}
        title={getTabTitleWithTooltip(
          FeatureViewTab.MATERIALIZATION,
          'Materialization is the process of loading feature data from the source into the online store so it can be used for real-time inference. Feature values are materialized at regular intervals.',
        )}
        aria-label="Feature view materialization tab"
        data-testid="feature-view-materialization-tab"
      >
        <PageSection
          hasBodyWrapper={false}
          isFilled
          data-testid="feature-view-materialization-tab-content"
        >
          <FeatureViewMaterialization featureView={featureView} />
        </PageSection>
      </Tab>
      {featureView.type === 'onDemandFeatureView' && (
        <Tab
          eventKey={FeatureViewTab.TRANSFORMATIONS}
          title={getTabTitleWithTooltip(
            FeatureViewTab.TRANSFORMATIONS,
            `A transformation defines how raw data from the source is converted into feature values—such as calculating aggregates or deriving timestamps.
            Transformations can be defined using expressions, code, or SQL depending on the feature store backend.`,
          )}
          aria-label="Feature view transformations tab"
          data-testid="feature-view-transformations-tab"
        >
          <PageSection
            hasBodyWrapper={false}
            isFilled
            data-testid="feature-view-transformations-tab-content"
          >
            <FeatureViewTransformation featureView={featureView} />
          </PageSection>
        </Tab>
      )}
    </Tabs>
  );
};

export default FeatureViewTabs;

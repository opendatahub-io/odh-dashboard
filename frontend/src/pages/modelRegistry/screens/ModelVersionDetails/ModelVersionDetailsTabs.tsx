import * as React from 'react';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import '~/pages/pipelines/global/runs/GlobalPipelineRunsTabs.scss';
import { ModelVersion } from '~/concepts/modelRegistry/types';
import { ModelVersionDetailsTabTitle, ModelVersionDetailsTab } from './const';
import ModelVersionDetailsView from './ModelVersionDetailsView';

type ModelVersionDetailTabsProps = {
  tab: ModelVersionDetailsTab;
  modelVersion: ModelVersion;
};

const ModelVersionDetailsTabs: React.FC<ModelVersionDetailTabsProps> = ({
  tab,
  modelVersion: mv,
}) => (
  <Tabs
    activeKey={tab}
    aria-label="Model versions details page tabs"
    role="region"
    data-testid="model-versions-details-page-tabs"
  >
    <Tab
      eventKey={ModelVersionDetailsTab.DETAILS}
      title={<TabTitleText>{ModelVersionDetailsTabTitle.DETAILS}</TabTitleText>}
      aria-label="Model versions details tab"
      data-testid="model-versions-details-tab"
    >
      <PageSection isFilled variant="light" data-testid="model-versions-details-tab-content">
        <ModelVersionDetailsView modelVersion={mv} />
      </PageSection>
    </Tab>
    <Tab
      eventKey={ModelVersionDetailsTab.REGISTERED_DEPLOYMENTS}
      title={<TabTitleText>{ModelVersionDetailsTabTitle.REGISTERED_DEPLOYMENTS}</TabTitleText>}
      aria-label="Registered deployments tab"
      data-testid="registered-deployments-tab"
    >
      <PageSection isFilled variant="light" data-testid="registered-deployments-tab-content">
        {/* TODO: Fill Model Details Page Component here */}
      </PageSection>
    </Tab>
  </Tabs>
);

export default ModelVersionDetailsTabs;

import * as React from 'react';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import '~/pages/pipelines/global/runs/GlobalPipelineRunsTabs.scss';
import { ModelVersion, RegisteredModel } from '~/concepts/modelRegistry/types';
import { ModelVersionsTabs, ModelVersionsTabTitle } from './const';
import ModelVersionListView from './ModelVersionListView';

type GlobalModelVersionsTabProps = {
  tab: ModelVersionsTabs;
  registeredModel?: RegisteredModel;
  modelVersions: ModelVersion[];
};

const GlobalModelVersionsTabs: React.FC<GlobalModelVersionsTabProps> = ({
  tab,
  registeredModel: rm,
  modelVersions,
}) => (
  <Tabs
    activeKey={tab}
    aria-label="Model versions page tabs"
    role="region"
    data-testid="model-versions-page-tabs"
  >
    <Tab
      eventKey={ModelVersionsTabs.VERSIONS}
      title={<TabTitleText>{ModelVersionsTabTitle.VERSIONS}</TabTitleText>}
      aria-label="Model versions tab"
      data-testid="model-versions-tab"
    >
      <PageSection isFilled variant="light" data-testid="model-versions-tab-content">
        <ModelVersionListView modelVersions={modelVersions} registeredModelName={rm?.name} />
      </PageSection>
    </Tab>
    <Tab
      eventKey={ModelVersionsTabs.DETAILS}
      title={<TabTitleText>{ModelVersionsTabTitle.DETAILS}</TabTitleText>}
      aria-label="Model Details tab"
      data-testid="model-details-tab"
    >
      <PageSection isFilled variant="light" data-testid="model-details-tab-content">
        {/* TODO: Fill Model Details Page Component here */}
      </PageSection>
    </Tab>
  </Tabs>
);
export default GlobalModelVersionsTabs;

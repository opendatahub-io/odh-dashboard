import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import '~/pages/pipelines/global/runs/GlobalPipelineRunsTabs.scss';
import { ModelVersion, RegisteredModel } from '~/concepts/modelRegistry/types';
import { ModelVersionsTabs, ModelVersionsTabTitle } from './const';
import ModelVersionListView from './ModelVersionListView';
import ModelDetailsView from './ModelDetailsView';

type GlobalModelVersionsTabProps = {
  tab: ModelVersionsTabs;
  registeredModel: RegisteredModel;
  modelVersions: ModelVersion[];
};

const GlobalModelVersionsTabs: React.FC<GlobalModelVersionsTabProps> = ({
  tab,
  registeredModel: rm,
  modelVersions,
}) => {
  const navigate = useNavigate();
  return (
    <Tabs
      activeKey={tab}
      aria-label="Model versions page tabs"
      role="region"
      data-testid="model-versions-page-tabs"
      onSelect={(_event, eventKey) => navigate(`../${eventKey}`, { relative: 'path' })}
    >
      <Tab
        eventKey={ModelVersionsTabs.VERSIONS}
        title={<TabTitleText>{ModelVersionsTabTitle.VERSIONS}</TabTitleText>}
        aria-label="Model versions tab"
        data-testid="model-versions-tab"
      >
        <PageSection isFilled variant="light" data-testid="model-versions-tab-content">
          <ModelVersionListView modelVersions={modelVersions} registeredModelName={rm.name} />
        </PageSection>
      </Tab>
      <Tab
        eventKey={ModelVersionsTabs.DETAILS}
        title={<TabTitleText>{ModelVersionsTabTitle.DETAILS}</TabTitleText>}
        aria-label="Model Details tab"
        data-testid="model-details-tab"
      >
        <PageSection isFilled variant="light" data-testid="model-details-tab-content">
          <ModelDetailsView registeredModel={rm} />
        </PageSection>
      </Tab>
    </Tabs>
  );
};
export default GlobalModelVersionsTabs;

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import '~/pages/pipelines/global/runs/GlobalPipelineRunsTabs.scss';
import { ModelVersion, RegisteredModel } from '~/concepts/modelRegistry/types';
import ModelVersionListView from './ModelVersionListView';
import ModelDetailsView from './ModelDetailsView';
import { ModelVersionsTab, ModelVersionsTabTitle } from './const';

type ModelVersionsTabProps = {
  tab: ModelVersionsTab;
  registeredModel: RegisteredModel;
  modelVersions: ModelVersion[];
  refresh: () => void;
  mvRefresh: () => void;
};

const ModelVersionsTabs: React.FC<ModelVersionsTabProps> = ({
  tab,
  registeredModel: rm,
  modelVersions,
  refresh,
  mvRefresh,
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
        eventKey={ModelVersionsTab.VERSIONS}
        title={<TabTitleText>{ModelVersionsTabTitle.VERSIONS}</TabTitleText>}
        aria-label="Model versions tab"
        data-testid="model-versions-tab"
      >
        <PageSection isFilled variant="light" data-testid="model-versions-tab-content">
          <ModelVersionListView
            modelVersions={modelVersions}
            registeredModel={rm}
            refresh={mvRefresh}
          />
        </PageSection>
      </Tab>
      <Tab
        eventKey={ModelVersionsTab.DETAILS}
        title={<TabTitleText>{ModelVersionsTabTitle.DETAILS}</TabTitleText>}
        aria-label="Model Details tab"
        data-testid="model-details-tab"
      >
        <PageSection isFilled variant="light" data-testid="model-details-tab-content">
          <ModelDetailsView registeredModel={rm} refresh={refresh} />
        </PageSection>
      </Tab>
    </Tabs>
  );
};
export default ModelVersionsTabs;

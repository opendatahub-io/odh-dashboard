import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import '#~/pages/pipelines/global/runs/GlobalPipelineRunsTabs.scss';
import { ModelVersion, RegisteredModel } from '#~/concepts/modelRegistry/types';
import ModelVersionListView from './ModelVersionListView';
import ModelDetailsView from './ModelDetailsView';
import { ModelVersionsTab, ModelVersionsTabTitle } from './const';

type ModelVersionsTabProps = {
  tab: ModelVersionsTab;
  registeredModel: RegisteredModel;
  modelVersions: ModelVersion[];
  isArchiveModel?: boolean;
  refresh: () => void;
  mvRefresh: () => void;
};

const ModelVersionsTabs: React.FC<ModelVersionsTabProps> = ({
  tab,
  registeredModel: rm,
  modelVersions,
  refresh,
  isArchiveModel,
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
        <PageSection hasBodyWrapper isFilled data-testid="model-versions-tab-content">
          <ModelVersionListView
            isArchiveModel={isArchiveModel}
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
        <PageSection hasBodyWrapper={false} isFilled data-testid="model-details-tab-content">
          <ModelDetailsView
            registeredModel={rm}
            refresh={refresh}
            isArchiveModel={isArchiveModel}
          />
        </PageSection>
      </Tab>
    </Tabs>
  );
};
export default ModelVersionsTabs;

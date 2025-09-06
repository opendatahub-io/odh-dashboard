import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import ModelDetailsView from '~/app/pages/modelRegistry/screens/ModelVersions/ModelDetailsView';
import { ModelVersion, RegisteredModel } from '~/app/types';
import {
  ModelVersionsTab,
  ModelVersionsTabTitle,
} from '~/app/pages/modelRegistry/screens/ModelVersions/const';
import ModelVersionListView from '~/app/pages/modelRegistry/screens/ModelVersions/ModelVersionListView';
import { isModelRegistryDetailsTabExtension } from '~/odh/extension-points/details';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';

type ModelVersionsTabProps = {
  tab: ModelVersionsTab | string;
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
  const tabExtensions = useExtensions(isModelRegistryDetailsTabExtension);
  const { registeredModelId: rmId } = useParams();
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  
  const modelDetailsTabs = [
    <Tab
      key={ModelVersionsTab.OVERVIEW}
      eventKey={ModelVersionsTab.OVERVIEW}
      title={<TabTitleText>{ModelVersionsTabTitle.OVERVIEW}</TabTitleText>}
      aria-label="Model Overview tab"
      data-testid="model-overview-tab"
    >
      <PageSection hasBodyWrapper={false} isFilled data-testid="model-details-tab-content">
        <ModelDetailsView
          registeredModel={rm}
          refresh={refresh}
          isArchiveModel={isArchiveModel}
        />
      </PageSection>
    </Tab>,
    <Tab
      key={ModelVersionsTab.VERSIONS}
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
    </Tab>,
    ...tabExtensions.map((extension) => (
      <Tab
        key={extension.properties.id}
        eventKey={extension.properties.id}
        aria-label={`${extension.properties.title} tab`}
        data-testid={`${extension.properties.id}-tab`}
        title={<TabTitleText>{extension.properties.title}</TabTitleText>}
      >
        <PageSection
          hasBodyWrapper={false}
          isFilled
          data-testid={`${extension.properties.id}-tab-content`}
        >
          <LazyCodeRefComponent
            component={extension.properties.component}
            props={{ rmId, mrName: preferredModelRegistry?.name }}
          />
        </PageSection>
      </Tab>
    )),
  ];

  return (
    <Tabs
      activeKey={tab}
      aria-label="Model versions page tabs"
      role="region"
      data-testid="model-versions-page-tabs"
      onSelect={(_event, eventKey) => navigate(`../${eventKey}`, { relative: 'path' })}
    >
      {modelDetailsTabs}
    </Tabs>
  );
};
export default ModelVersionsTabs;

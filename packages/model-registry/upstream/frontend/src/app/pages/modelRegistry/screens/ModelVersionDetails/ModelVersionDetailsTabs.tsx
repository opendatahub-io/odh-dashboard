import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { ModelVersion, ModelArtifactList, RegisteredModel } from '~/app/types';
import { ModelVersionDetailsTabTitle, ModelVersionDetailsTab } from './const';
import ModelVersionDetailsView from './ModelVersionDetailsView';
import { isModelRegistryVersionDetailsTabExtension } from '~/odh/extension-points/details';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';
import { DEPLOYMENTS_TAB_EXTENSION_ID } from '~/odh/const';

type ModelVersionDetailTabsProps = {
  tab: string;
  registeredModel: RegisteredModel | null;
  modelVersion: ModelVersion;
  isArchiveVersion?: boolean;
  refresh: () => void;
  modelArtifacts: ModelArtifactList;
  modelArtifactsLoaded: boolean;
  modelArtifactsLoadError: Error | undefined;
};

const ModelVersionDetailsTabs: React.FC<ModelVersionDetailTabsProps> = ({
  tab,
  registeredModel,
  modelVersion: mv,
  isArchiveVersion,
  refresh,
  modelArtifacts,
  modelArtifactsLoaded,
  modelArtifactsLoadError,
}) => {
  const navigate = useNavigate();
  const tabExtensions = useExtensions(isModelRegistryVersionDetailsTabExtension);
  const { registeredModelId: rmId } = useParams();
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const modelVersionDetails = [
    <Tab
      key={ModelVersionDetailsTab.DETAILS}
      eventKey={ModelVersionDetailsTab.DETAILS}
      title={<TabTitleText>{ModelVersionDetailsTabTitle.DETAILS}</TabTitleText>}
      aria-label="Model versions details tab"
      data-testid="model-versions-details-tab"
    >
      <PageSection hasBodyWrapper={false} isFilled data-testid="model-versions-details-tab-content">
        <ModelVersionDetailsView
          registeredModel={registeredModel}
          modelVersion={mv}
          refresh={refresh}
          isArchiveVersion={isArchiveVersion}
          modelArtifacts={modelArtifacts}
          modelArtifactsLoaded={modelArtifactsLoaded}
          modelArtifactsLoadError={modelArtifactsLoadError}
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
            props={{ rmId, mvId: mv.id, mrName: preferredModelRegistry?.name }}
          />
        </PageSection>
      </Tab>
    )),
  ];

  return (
    <Tabs
      activeKey={tab}
      aria-label="Model versions details page tabs"
      role="region"
      data-testid="model-versions-details-page-tabs"
      onSelect={(_event, eventKey) => navigate(`../${eventKey}`, { relative: 'path' })}
    >
      {isArchiveVersion ? modelVersionDetails.filter((tab) => tab.key !== DEPLOYMENTS_TAB_EXTENSION_ID) : modelVersionDetails}
    </Tabs>
  );
};

export default ModelVersionDetailsTabs;

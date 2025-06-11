import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import '#~/pages/pipelines/global/runs/GlobalPipelineRunsTabs.scss';
import { ModelVersion, ModelArtifactList } from '#~/concepts/modelRegistry/types';
import { InferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import { ListWithNonDashboardPresence } from '#~/types';
import { FetchStateObject } from '#~/utilities/useFetch';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { ModelVersionDetailsTabTitle, ModelVersionDetailsTab } from './const';
import ModelVersionDetailsView from './ModelVersionDetailsView';
import ModelVersionRegisteredDeploymentsView from './ModelVersionRegisteredDeploymentsView';

type ModelVersionDetailTabsProps = {
  tab: ModelVersionDetailsTab;
  modelVersion: ModelVersion;
  inferenceServices: FetchStateObject<ListWithNonDashboardPresence<InferenceServiceKind>>;
  servingRuntimes: FetchStateObject<ListWithNonDashboardPresence<ServingRuntimeKind>>;
  isArchiveVersion?: boolean;
  refresh: () => void;
  modelArtifacts: ModelArtifactList;
  modelArtifactsLoaded: boolean;
  modelArtifactsLoadError: Error | undefined;
};

const ModelVersionDetailsTabs: React.FC<ModelVersionDetailTabsProps> = ({
  tab,
  modelVersion: mv,
  inferenceServices,
  servingRuntimes,
  isArchiveVersion,
  refresh,
  modelArtifacts,
  modelArtifactsLoaded,
  modelArtifactsLoadError,
}) => {
  const navigate = useNavigate();
  const { status: isModelServingEnabled } = useIsAreaAvailable(SupportedArea.MODEL_SERVING);

  return (
    <Tabs
      activeKey={tab}
      aria-label="Model versions details page tabs"
      role="region"
      data-testid="model-versions-details-page-tabs"
      onSelect={(_event, eventKey) => navigate(`../${eventKey}`, { relative: 'path' })}
    >
      <Tab
        eventKey={ModelVersionDetailsTab.DETAILS}
        title={<TabTitleText>{ModelVersionDetailsTabTitle.DETAILS}</TabTitleText>}
        aria-label="Model versions details tab"
        data-testid="model-versions-details-tab"
      >
        <PageSection
          hasBodyWrapper={false}
          isFilled
          data-testid="model-versions-details-tab-content"
        >
          <ModelVersionDetailsView
            modelVersion={mv}
            refresh={refresh}
            isArchiveVersion={isArchiveVersion}
            modelArtifacts={modelArtifacts}
            modelArtifactsLoaded={modelArtifactsLoaded}
            modelArtifactsLoadError={modelArtifactsLoadError}
          />
        </PageSection>
      </Tab>
      {!isArchiveVersion && isModelServingEnabled && (
        <Tab
          eventKey={ModelVersionDetailsTab.DEPLOYMENTS}
          title={<TabTitleText>{ModelVersionDetailsTabTitle.DEPLOYMENTS}</TabTitleText>}
          aria-label="Deployments tab"
          data-testid="deployments-tab"
        >
          <PageSection hasBodyWrapper={false} isFilled data-testid="deployments-tab-content">
            <ModelVersionRegisteredDeploymentsView
              inferenceServices={inferenceServices}
              servingRuntimes={servingRuntimes}
              refresh={refresh}
            />
          </PageSection>
        </Tab>
      )}
    </Tabs>
  );
};

export default ModelVersionDetailsTabs;

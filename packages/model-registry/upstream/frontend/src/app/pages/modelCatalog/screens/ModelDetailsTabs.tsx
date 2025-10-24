import * as React from 'react';
import { Tabs, Tab, TabTitleText, PageSection } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import {
  CatalogArtifactList,
  CatalogArtifactType,
  CatalogModel,
  CatalogPerformanceMetricsArtifact,
  MetricsType,
} from '~/app/modelCatalogTypes';
import {
  shouldShowValidatedInsights,
  filterArtifactsByType,
} from '~/app/pages/modelCatalog/utils/modelCatalogUtils';
import ModelDetailsView from './ModelDetailsView';
import PerformanceInsightsView from './PerformanceInsightsView';

export enum ModelDetailsTab {
  OVERVIEW = 'overview',
  PERFORMANCE_INSIGHTS = 'performance-insights',
}

export enum ModelDetailsTabTitle {
  OVERVIEW = 'Overview',
  PERFORMANCE_INSIGHTS = 'Performance insights',
}

type ModelDetailsTabsProps = {
  model: CatalogModel;
  tab: ModelDetailsTab;
  artifacts: CatalogArtifactList;
  artifactLoaded: boolean;
  artifactsLoadError: Error | undefined;
};

const ModelDetailsTabs = ({
  model,
  tab,
  artifacts,
  artifactLoaded,
  artifactsLoadError,
}: ModelDetailsTabsProps): React.JSX.Element => {
  const navigate = useNavigate();

  const performanceArtifacts = React.useMemo(
    () =>
      filterArtifactsByType<CatalogPerformanceMetricsArtifact>(
        artifacts.items,
        CatalogArtifactType.metricsArtifact,
        MetricsType.performanceMetrics,
      ),
    [artifacts.items],
  );
  const showValidatedInsights = shouldShowValidatedInsights(model, artifacts.items);

  const handleTabClick = (
    _event: React.MouseEvent<HTMLElement, MouseEvent>,
    tabIndex: string | number,
  ) => {
    const validTab = Object.values(ModelDetailsTab).find((t) => t === tabIndex);
    if (validTab) {
      navigate(`../${validTab}`, { relative: 'path' });
    }
  };

  if (!showValidatedInsights) {
    return (
      <PageSection
        hasBodyWrapper={false}
        isFilled
        data-testid="model-overview-tab-content"
        padding={{ default: 'noPadding' }}
      >
        <ModelDetailsView
          model={model}
          artifacts={artifacts}
          artifactLoaded={artifactLoaded}
          artifactsLoadError={artifactsLoadError}
        />
      </PageSection>
    );
  }

  return (
    <Tabs
      activeKey={tab}
      onSelect={handleTabClick}
      aria-label="Model details page tabs"
      role="region"
      data-testid="model-details-page-tabs"
    >
      <Tab
        eventKey={ModelDetailsTab.OVERVIEW}
        title={<TabTitleText>{ModelDetailsTabTitle.OVERVIEW}</TabTitleText>}
        aria-label="Model overview tab"
        data-testid="model-overview-tab"
      >
        <PageSection
          hasBodyWrapper={false}
          isFilled
          data-testid="model-overview-tab-content"
          padding={{ default: 'noPadding' }}
        >
          <ModelDetailsView
            model={model}
            artifacts={artifacts}
            artifactLoaded={artifactLoaded}
            artifactsLoadError={artifactsLoadError}
          />
        </PageSection>
      </Tab>
      <Tab
        eventKey={ModelDetailsTab.PERFORMANCE_INSIGHTS}
        title={<TabTitleText>{ModelDetailsTabTitle.PERFORMANCE_INSIGHTS}</TabTitleText>}
        aria-label="Performance insights tab"
        data-testid="performance-insights-tab"
      >
        <PageSection
          hasBodyWrapper={false}
          isFilled
          data-testid="performance-insights-tab-content"
          padding={{ default: 'noPadding' }}
        >
          <PerformanceInsightsView
            performanceArtifacts={performanceArtifacts}
            isLoading={!artifactLoaded}
          />
        </PageSection>
      </Tab>
    </Tabs>
  );
};

export default ModelDetailsTabs;

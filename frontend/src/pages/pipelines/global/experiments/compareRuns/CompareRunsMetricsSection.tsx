import React from 'react';

import { ExpandableSection, Tab, TabContentBody, TabTitleText, Tabs } from '@patternfly/react-core';
import { useCompareRuns } from '~/concepts/pipelines/content/compareRuns/CompareRunsContext';
import { useGetArtifactTypes } from '~/concepts/pipelines/apiHooks/mlmd/useGetArtifactTypes';
import { RunArtifact } from '~/concepts/pipelines/apiHooks/mlmd/types';
import {
  MetricSectionTabLabels,
  MetricsType,
} from '~/concepts/pipelines/content/compareRuns/metricsSection/const';
import {
  filterRunArtifactsByType,
  getRunArtifacts,
} from '~/concepts/pipelines/content/compareRuns/metricsSection/utils';
import useMlmdPackagesForPipelineRuns from '~/concepts/pipelines/content/compareRuns/metricsSection/useMlmdPackagesForPipelineRuns';
import ScalarMetricTable from '~/concepts/pipelines/content/compareRuns/metricsSection/scalar/ScalarMetricTable';
import RocCurveCompare from '~/concepts/pipelines/content/compareRuns/metricsSection/roc/RocCurveCompare';
import ConfusionMatrixCompare from '~/concepts/pipelines/content/compareRuns/metricsSection/confusionMatrix/ConfusionMatrixCompare';
import MarkdownCompare from '~/concepts/pipelines/content/compareRuns/metricsSection/markdown/MarkdownCompare';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

export const CompareRunMetricsSection: React.FunctionComponent = () => {
  const { runs, selectedRuns } = useCompareRuns();
  const [mlmdPackages, mlmdPackagesLoaded] = useMlmdPackagesForPipelineRuns(runs);
  const [artifactTypes, artifactTypesLoaded] = useGetArtifactTypes();
  const [isSectionOpen, setIsSectionOpen] = React.useState(true);
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(
    MetricSectionTabLabels.SCALAR,
  );
  const isS3EndpointAvailable = useIsAreaAvailable(SupportedArea.S3_ENDPOINT).status;

  const selectedMlmdPackages = React.useMemo(
    () =>
      mlmdPackages.filter((mlmdPackage) =>
        selectedRuns.some((run) => run.run_id === mlmdPackage.run.run_id),
      ),
    [mlmdPackages, selectedRuns],
  );

  const isLoaded = mlmdPackagesLoaded && artifactTypesLoaded;

  const [
    scalarMetricsArtifactData,
    confusionMatrixArtifactData,
    rocCurveArtifactData,
    markdownArtifactData,
  ] = React.useMemo(() => {
    if (!isLoaded) {
      return [[], [], [], []];
    }

    const runArtifacts: RunArtifact[] = getRunArtifacts(selectedMlmdPackages);
    return [
      filterRunArtifactsByType(runArtifacts, artifactTypes, MetricsType.SCALAR_METRICS),
      filterRunArtifactsByType(runArtifacts, artifactTypes, MetricsType.CONFUSION_MATRIX),
      filterRunArtifactsByType(runArtifacts, artifactTypes, MetricsType.ROC_CURVE),
      filterRunArtifactsByType(runArtifacts, artifactTypes, MetricsType.MARKDOWN),
    ];
  }, [artifactTypes, isLoaded, selectedMlmdPackages]);

  return (
    <ExpandableSection
      toggleText="Metrics"
      onToggle={(_, isOpen) => setIsSectionOpen(isOpen)}
      isExpanded={isSectionOpen}
      isIndented
      data-testid="compare-runs-metrics-content"
    >
      <Tabs activeKey={activeTabKey} onSelect={(_e, key) => setActiveTabKey(key)}>
        <Tab
          eventKey={MetricSectionTabLabels.SCALAR}
          title={<TabTitleText>{MetricSectionTabLabels.SCALAR}</TabTitleText>}
          data-testid="compare-runs-scalar-metrics-tab"
        >
          <TabContentBody hasPadding data-testid="compare-runs-scalar-metrics-tab-content">
            <ScalarMetricTable runArtifacts={scalarMetricsArtifactData} isLoaded={isLoaded} />
          </TabContentBody>
        </Tab>
        <Tab
          eventKey={MetricSectionTabLabels.CONFUSION_MATRIX}
          title={<TabTitleText>{MetricSectionTabLabels.CONFUSION_MATRIX}</TabTitleText>}
          data-testid="compare-runs-confusion-matrix-tab"
        >
          <TabContentBody hasPadding data-testid="compare-runs-confusion-matrix-tab-content">
            <ConfusionMatrixCompare
              runArtifacts={confusionMatrixArtifactData}
              isLoaded={isLoaded}
            />
          </TabContentBody>
        </Tab>
        <Tab
          eventKey={MetricSectionTabLabels.ROC_CURVE}
          title={<TabTitleText>{MetricSectionTabLabels.ROC_CURVE}</TabTitleText>}
          data-testid="compare-runs-roc-curve-tab"
        >
          <TabContentBody hasPadding data-testid="compare-runs-roc-curve-tab-content">
            <RocCurveCompare runArtifacts={rocCurveArtifactData} isLoaded={isLoaded} />
          </TabContentBody>
        </Tab>
        {isS3EndpointAvailable && (
          <Tab
            eventKey={MetricSectionTabLabels.MARKDOWN}
            title={<TabTitleText>{MetricSectionTabLabels.MARKDOWN}</TabTitleText>}
            data-testid="compare-runs-markdown-tab"
          >
            <TabContentBody hasPadding data-testid="compare-runs-markdown-tab-content">
              <MarkdownCompare runArtifacts={markdownArtifactData} isLoaded={isLoaded} />
            </TabContentBody>
          </Tab>
        )}
      </Tabs>
    </ExpandableSection>
  );
};

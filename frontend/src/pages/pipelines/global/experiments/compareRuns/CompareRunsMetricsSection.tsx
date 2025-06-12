import React from 'react';
import * as _ from 'lodash-es';
import { ExpandableSection, Tab, TabContentBody, TabTitleText, Tabs } from '@patternfly/react-core';
import { useCompareRuns } from '#~/concepts/pipelines/content/compareRuns/CompareRunsContext';
import { useGetArtifactTypes } from '#~/concepts/pipelines/apiHooks/mlmd/useGetArtifactTypes';
import { MlmdContextTypes, RunArtifact } from '#~/concepts/pipelines/apiHooks/mlmd/types';
import {
  MetricSectionTabLabels,
  MetricsType,
} from '#~/concepts/pipelines/content/compareRuns/metricsSection/const';
import {
  filterRunArtifactsByType,
  getRunArtifacts,
} from '#~/concepts/pipelines/content/compareRuns/metricsSection/utils';
import useMlmdPackagesForPipelineRuns from '#~/concepts/pipelines/content/compareRuns/metricsSection/useMlmdPackagesForPipelineRuns';
import ScalarMetricTable from '#~/concepts/pipelines/content/compareRuns/metricsSection/scalar/ScalarMetricTable';
import RocCurveCompare from '#~/concepts/pipelines/content/compareRuns/metricsSection/roc/RocCurveCompare';
import ConfusionMatrixCompare from '#~/concepts/pipelines/content/compareRuns/metricsSection/confusionMatrix/ConfusionMatrixCompare';
import MarkdownCompare from '#~/concepts/pipelines/content/compareRuns/metricsSection/markdown/MarkdownCompare';
import useFetchMarkdownMaps from '#~/concepts/pipelines/content/compareRuns/metricsSection/markdown/useFetchMarkdownMaps';
import { useMlmdContextsByType } from '#~/concepts/pipelines/apiHooks/mlmd/useMlmdContextsByType';

export const CompareRunMetricsSection: React.FunctionComponent = () => {
  const { runs, selectedRuns } = useCompareRuns();
  const [contexts, contextsLoaded] = useMlmdContextsByType(MlmdContextTypes.RUN);
  const [mlmdPackages, mlmdPackagesLoaded] = useMlmdPackagesForPipelineRuns(runs, contexts);
  const [artifactTypes, artifactTypesLoaded] = useGetArtifactTypes();
  const [isSectionOpen, setIsSectionOpen] = React.useState(true);
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(
    MetricSectionTabLabels.SCALAR,
  );

  const runArtifacts: RunArtifact[] = React.useMemo(
    () => getRunArtifacts(mlmdPackages),
    [mlmdPackages],
  );

  const isLoaded = mlmdPackagesLoaded && contextsLoaded && artifactTypesLoaded;

  const [markdownArtifacts, ...allArtifacts] = React.useMemo(() => {
    if (!isLoaded) {
      return [[], [], [], []];
    }

    return [
      filterRunArtifactsByType(runArtifacts, artifactTypes, MetricsType.MARKDOWN),
      filterRunArtifactsByType(runArtifacts, artifactTypes, MetricsType.SCALAR_METRICS),
      filterRunArtifactsByType(runArtifacts, artifactTypes, MetricsType.CONFUSION_MATRIX),
      filterRunArtifactsByType(runArtifacts, artifactTypes, MetricsType.ROC_CURVE),
    ];
  }, [artifactTypes, isLoaded, runArtifacts]);

  const { configMap, configsLoaded, runMap } = useFetchMarkdownMaps(markdownArtifacts);
  const [selectedConfigMap, selectedRunMap] = React.useMemo(() => {
    const selectedIds = selectedRuns.map((run) => run.run_id);
    return [_.pick(configMap, selectedIds), _.pick(runMap, selectedIds)];
  }, [configMap, runMap, selectedRuns]);

  const isEmpty = selectedRuns.length === 0;

  const filterSelected = React.useCallback(
    (runArtifact: RunArtifact) => selectedRuns.some((run) => run.run_id === runArtifact.run.run_id),
    [selectedRuns],
  );

  const [scalarMetricsArtifactData, confusionMatrixArtifactData, rocCurveArtifactData] =
    React.useMemo(
      () => allArtifacts.map((artifacts) => artifacts.filter(filterSelected)),
      [allArtifacts, filterSelected],
    );

  return (
    <ExpandableSection
      toggleText="Metrics"
      onToggle={(_event, isOpen) => setIsSectionOpen(isOpen)}
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
            <ScalarMetricTable
              runArtifacts={scalarMetricsArtifactData}
              isEmpty={isEmpty}
              isLoaded={isLoaded}
            />
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
              isEmpty={isEmpty}
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
            <RocCurveCompare
              runArtifacts={rocCurveArtifactData}
              isEmpty={isEmpty}
              isLoaded={isLoaded}
            />
          </TabContentBody>
        </Tab>
        <Tab
          eventKey={MetricSectionTabLabels.MARKDOWN}
          title={<TabTitleText>{MetricSectionTabLabels.MARKDOWN}</TabTitleText>}
          data-testid="compare-runs-markdown-tab"
        >
          <TabContentBody hasPadding data-testid="compare-runs-markdown-tab-content">
            <MarkdownCompare
              configMap={selectedConfigMap}
              runMap={selectedRunMap}
              isEmpty={isEmpty}
              isLoaded={isLoaded && configsLoaded}
            />
          </TabContentBody>
        </Tab>
      </Tabs>
    </ExpandableSection>
  );
};

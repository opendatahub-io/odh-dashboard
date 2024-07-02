import React from 'react';
import _ from 'lodash-es';
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
import useFetchMarkdownMaps from '~/concepts/pipelines/content/compareRuns/metricsSection/markdown/useFetchMarkdownMaps';

export const CompareRunMetricsSection: React.FunctionComponent = () => {
  const { runs, selectedRuns } = useCompareRuns();
  const [mlmdPackages, mlmdPackagesLoaded] = useMlmdPackagesForPipelineRuns(runs);
  const [artifactTypes, artifactTypesLoaded] = useGetArtifactTypes();
  const [isSectionOpen, setIsSectionOpen] = React.useState(true);
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(
    MetricSectionTabLabels.SCALAR,
  );
  const isS3EndpointAvailable = useIsAreaAvailable(SupportedArea.S3_ENDPOINT).status;

  const runArtifacts: RunArtifact[] = React.useMemo(
    () => getRunArtifacts(mlmdPackages),
    [mlmdPackages],
  );

  const isLoaded = mlmdPackagesLoaded && artifactTypesLoaded;

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
    >
      <Tabs activeKey={activeTabKey} onSelect={(_e, key) => setActiveTabKey(key)}>
        <Tab
          eventKey={MetricSectionTabLabels.SCALAR}
          title={<TabTitleText>{MetricSectionTabLabels.SCALAR}</TabTitleText>}
        >
          <TabContentBody hasPadding>
            <ScalarMetricTable runArtifacts={scalarMetricsArtifactData} isLoaded={isLoaded} />
          </TabContentBody>
        </Tab>
        <Tab
          eventKey={MetricSectionTabLabels.CONFUSION_MATRIX}
          title={<TabTitleText>{MetricSectionTabLabels.CONFUSION_MATRIX}</TabTitleText>}
        >
          <TabContentBody hasPadding>
            <ConfusionMatrixCompare
              runArtifacts={confusionMatrixArtifactData}
              isLoaded={isLoaded}
            />
          </TabContentBody>
        </Tab>
        <Tab
          eventKey={MetricSectionTabLabels.ROC_CURVE}
          title={<TabTitleText>{MetricSectionTabLabels.ROC_CURVE}</TabTitleText>}
        >
          <TabContentBody hasPadding>
            <RocCurveCompare runArtifacts={rocCurveArtifactData} isLoaded={isLoaded} />
          </TabContentBody>
        </Tab>
        {isS3EndpointAvailable && (
          <Tab
            eventKey={MetricSectionTabLabels.MARKDOWN}
            title={<TabTitleText>{MetricSectionTabLabels.MARKDOWN}</TabTitleText>}
          >
            <TabContentBody hasPadding>
              <MarkdownCompare
                configMap={selectedConfigMap}
                runMap={selectedRunMap}
                isEmpty={selectedRuns.length === 0}
                isLoaded={isLoaded && configsLoaded}
              />
            </TabContentBody>
          </Tab>
        )}
      </Tabs>
    </ExpandableSection>
  );
};

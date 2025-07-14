import * as React from 'react';
import { Bullseye, Flex, Spinner, Split, SplitItem, Content } from '@patternfly/react-core';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip';
import { useCheckboxTableBase } from '#~/components/table';
import ROCCurve from '#~/concepts/pipelines/content/artifacts/charts/ROCCurve';
import { RunArtifact } from '#~/concepts/pipelines/apiHooks/mlmd/types';
import {
  getFullArtifactPathLabel,
  getFullArtifactPaths,
  getLinkedArtifactId,
} from '#~/concepts/pipelines/content/compareRuns/metricsSection/utils';
import { CompareRunsEmptyState } from '#~/concepts/pipelines/content/compareRuns/CompareRunsEmptyState';
import { CompareRunsNoMetrics } from '#~/concepts/pipelines/content/compareRuns/CompareRunsNoMetrics';
import RocCurveTable from './RocCurveTable';
import { FullArtifactPathsAndConfig } from './types';
import { isConfidenceMetric, buildRocCurveConfig } from './utils';

type RocCurveCompareProps = {
  runArtifacts?: RunArtifact[];
  isLoaded: boolean;
  isEmpty: boolean;
};

const RocCurveCompare: React.FC<RocCurveCompareProps> = ({ runArtifacts, isLoaded, isEmpty }) => {
  const [search, setSearch] = React.useState<string>('');
  const [selected, setSelected] = React.useState<FullArtifactPathsAndConfig[]>([]);

  const configs = React.useMemo(() => {
    if (!runArtifacts) {
      return [];
    }

    const fullArtifactPaths = getFullArtifactPaths(runArtifacts);
    return fullArtifactPaths
      .map((fullArtifactPath) => {
        const customProperties = fullArtifactPath.linkedArtifact.artifact.getCustomPropertiesMap();
        return {
          data: customProperties.get('confidenceMetrics')?.getStructValue()?.toJavaScript(),
          fullArtifactPath,
        };
      })
      .filter((confidenceMetrics) => !!confidenceMetrics.data)
      .map(({ data, fullArtifactPath }, i) => {
        // validate the custom properties
        const confidenceMetricsArray = data?.list;
        if (
          !confidenceMetricsArray ||
          !Array.isArray(confidenceMetricsArray) ||
          !confidenceMetricsArray.every(isConfidenceMetric)
        ) {
          throw new Error('Invalid confidence metrics data');
        }
        return {
          config: buildRocCurveConfig(confidenceMetricsArray, i),
          fullArtifactPath,
        };
      });
  }, [runArtifacts]);

  // Set the selected artifacts to all by default
  React.useEffect(() => {
    setSelected(configs);
  }, [configs]);

  const checkboxTableProps = useCheckboxTableBase<FullArtifactPathsAndConfig>(
    configs,
    selected,
    setSelected,
    React.useCallback(
      ({ fullArtifactPath }) => getLinkedArtifactId(fullArtifactPath.linkedArtifact),
      [],
    ),
  );

  const filteredConfigs = configs.filter(({ fullArtifactPath }) =>
    getFullArtifactPathLabel(fullArtifactPath).includes(search),
  );

  if (!isLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (isEmpty) {
    return <CompareRunsEmptyState data-testid="compare-runs-roc-curve-empty-state" />;
  }
  if (Object.keys(configs).length === 0) {
    return <CompareRunsNoMetrics data-testid="compare-runs-roc-curve-no-data-state" />;
  }

  return (
    <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsMd' }}>
      <Split hasGutter>
        <SplitItem>
          <Content component="p">ROC curve: multiple artifacts</Content>
        </SplitItem>
        <SplitItem>
          <DashboardHelpTooltip content="The receiver operating characteristic (ROC) curve shows the performance of a model at varying threshold values by plotting the true positive rate against the false positive rate." />
        </SplitItem>
      </Split>
      <ROCCurve configs={selected.map((r) => r.config)} />
      <RocCurveTable
        fullArtifactPaths={filteredConfigs}
        setSearch={setSearch}
        {...checkboxTableProps}
      />
    </Flex>
  );
};
export default RocCurveCompare;

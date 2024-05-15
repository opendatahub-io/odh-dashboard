import * as React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateVariant,
  Flex,
  Spinner,
  Split,
  SplitItem,
  Text,
} from '@patternfly/react-core';
import DashboardHelpTooltip from '~/concepts/dashboard/DashboardHelpTooltip';
import { useCheckboxTableBase } from '~/components/table';
import ROCCurve from '~/concepts/pipelines/content/artifacts/charts/ROCCurve';
import { RunArtifact } from '~/concepts/pipelines/apiHooks/mlmd/types';
import {
  getFullArtifactPathLabel,
  getFullArtifactPaths,
  getLinkedArtifactId,
} from '~/concepts/pipelines/content/compareRuns/metricsSection/utils';
import { CompareRunsEmptyState } from '~/concepts/pipelines/content/compareRuns/CompareRunsEmptyState';
import RocCurveTable from './RocCurveTable';
import { FullArtifactPathsAndConfig } from './types';
import { isConfidenceMetric, buildRocCurveConfig } from './utils';

type RocCurveCompareProps = {
  runArtifacts?: RunArtifact[];
  isLoaded: boolean;
};

const RocCurveCompare: React.FC<RocCurveCompareProps> = ({ runArtifacts, isLoaded }) => {
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

  if (!runArtifacts || runArtifacts.length === 0) {
    return <CompareRunsEmptyState />;
  }
  if (Object.keys(configs).length === 0) {
    return (
      <EmptyState variant={EmptyStateVariant.xs}>
        <EmptyStateHeader titleText="No ROC curve artifacts" headingLevel="h4" />
        <EmptyStateBody>
          There are no ROC curve artifacts available on the selected runs.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsMd' }}>
      <Split hasGutter>
        <SplitItem>
          <Text>ROC Curve: multiple artifacts</Text>
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

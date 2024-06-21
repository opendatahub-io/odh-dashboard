import * as React from 'react';
import {
  Bullseye,
  Divider,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Spinner,
} from '@patternfly/react-core';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { RunArtifact } from '~/concepts/pipelines/apiHooks/mlmd/types';

import { FullArtifactPath } from '~/concepts/pipelines/content/compareRuns/metricsSection/types';
import {
  getFullArtifactPaths,
  getFullArtifactPathLabel,
} from '~/concepts/pipelines/content/compareRuns/metricsSection/utils';
import { CompareRunsEmptyState } from '~/concepts/pipelines/content/compareRuns/CompareRunsEmptyState';
import { PipelineRunArtifactSelect } from '~/concepts/pipelines/content/compareRuns/metricsSection/PipelineRunArtifactSelect';
import { ConfusionMatrixConfig } from '~/concepts/pipelines/content/artifacts/charts/confusionMatrix/types';
import { buildConfusionMatrixConfig } from '~/concepts/pipelines/content/artifacts/charts/confusionMatrix/utils';
import ConfusionMatrix from '~/concepts/pipelines/content/artifacts/charts/confusionMatrix/ConfusionMatrix';
import { isConfusionMatrix } from './utils';
import { ConfusionMatrixConfigAndTitle } from './types';

type ConfusionMatrixCompareProps = {
  runArtifacts?: RunArtifact[];
  isLoaded: boolean;
};

const ConfusionMatrixCompare: React.FC<ConfusionMatrixCompareProps> = ({
  runArtifacts,
  isLoaded,
}) => {
  const [expandedGraph, setExpandedGraph] = React.useState<
    ConfusionMatrixConfigAndTitle | undefined
  >(undefined);

  const fullArtifactPaths: FullArtifactPath[] = React.useMemo(() => {
    if (!runArtifacts) {
      return [];
    }

    return getFullArtifactPaths(runArtifacts);
  }, [runArtifacts]);

  const { configMap, runMap } = React.useMemo(
    () =>
      fullArtifactPaths.reduce<{
        runMap: Record<string, PipelineRunKFv2>;
        configMap: Record<string, { title: string; config: ConfusionMatrixConfig }[]>;
      }>(
        (acc, fullPath) => {
          const customProperties = fullPath.linkedArtifact.artifact.getCustomPropertiesMap();
          const data = customProperties.get('confusionMatrix')?.getStructValue()?.toJavaScript();

          if (data) {
            const confusionMatrixData = data.struct;
            if (isConfusionMatrix(confusionMatrixData)) {
              const runId = fullPath.run.run_id;
              const title = getFullArtifactPathLabel(fullPath);
              const metric = {
                title,
                config: buildConfusionMatrixConfig(confusionMatrixData),
              };

              // Add run to runMapBuilder
              acc.runMap[runId] = fullPath.run;

              // Add or append the metric to the configMapBuilder
              if (runId in acc.configMap) {
                acc.configMap[runId].push(metric);
              } else {
                acc.configMap[runId] = [metric];
              }
            }
          }

          return acc;
        },
        { runMap: {}, configMap: {} },
      ),
    [fullArtifactPaths],
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
  if (Object.keys(configMap).length === 0) {
    return (
      <EmptyState variant={EmptyStateVariant.xs}>
        <EmptyStateHeader titleText="No confusion matrix artifacts" headingLevel="h4" />
        <EmptyStateBody>
          There are no confusion matrix artifacts available on the selected runs.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      {expandedGraph ? (
        <Bullseye>
          <PipelineRunArtifactSelect
            data={[expandedGraph]}
            setExpandedGraph={(config) => setExpandedGraph(config)}
            expandedGraph={expandedGraph}
            renderArtifact={(config) => <ConfusionMatrix size={150} config={config.config} />}
          />
        </Bullseye>
      ) : (
        <Flex flexWrap={{ default: 'nowrap' }}>
          {Object.entries(configMap).map(([runId, matrixData]) => (
            <React.Fragment key={runId}>
              <FlexItem>
                <PipelineRunArtifactSelect
                  run={runMap[runId]}
                  data={matrixData}
                  setExpandedGraph={(config) => setExpandedGraph(config)}
                  expandedGraph={expandedGraph}
                  renderArtifact={(config) => <ConfusionMatrix size={125} config={config.config} />}
                />
              </FlexItem>
              <Divider
                orientation={{
                  default: 'vertical',
                }}
              />
            </React.Fragment>
          ))}
        </Flex>
      )}
    </div>
  );
};
export default ConfusionMatrixCompare;

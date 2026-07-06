import * as React from 'react';
import {
  Bullseye,
  Divider,
  Flex,
  FlexItem,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { CompareRunsEmptyState } from '#~/concepts/pipelines/content/compareRuns/CompareRunsEmptyState';
import { PipelineRunArtifactSelect } from '#~/concepts/pipelines/content/compareRuns/metricsSection/PipelineRunArtifactSelect';
import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { CompareRunsNoMetrics } from '#~/concepts/pipelines/content/compareRuns/CompareRunsNoMetrics';

type MarkdownCompareProps = {
  configMap: Record<string, MarkdownAndTitle[]>;
  runMap: Record<string, PipelineRunKF>;
  isEmpty: boolean;
  isLoaded: boolean;
};

export type MarkdownAndTitle = {
  title: string;
  config: string;
  fileSize?: number;
};

const MarkdownCompare: React.FC<MarkdownCompareProps> = ({
  configMap,
  runMap,
  isLoaded,
  isEmpty,
}) => {
  const [expandedGraph, setExpandedGraph] = React.useState<MarkdownAndTitle | undefined>(undefined);
  if (!isLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (isEmpty) {
    return <CompareRunsEmptyState data-testid="compare-runs-markdown-empty-state" />;
  }

  if (Object.keys(configMap).length === 0) {
    return <CompareRunsNoMetrics data-testid="compare-runs-markdown-no-data-state" />;
  }

  const renderMarkdownWithSize = (config: MarkdownAndTitle) => (
    <Stack hasGutter>
      <StackItem>
        <iframe data-testid="markdown-compare" src={config.config} title="markdown view" />
      </StackItem>
    </Stack>
  );

  return (
    <div style={{ overflowX: 'auto' }}>
      {expandedGraph ? (
        <Bullseye data-testid="compare-runs-markdown-expanded-graph">
          <PipelineRunArtifactSelect
            data={[expandedGraph]}
            setExpandedGraph={(config) => setExpandedGraph(config)}
            expandedGraph={expandedGraph}
            renderArtifact={renderMarkdownWithSize}
          />
        </Bullseye>
      ) : (
        <Flex flexWrap={{ default: 'nowrap' }}>
          {Object.entries(configMap).map(([runId, configs]) => (
            <React.Fragment key={runId}>
              <FlexItem data-testid={`compare-runs-markdown-${runId}`}>
                <PipelineRunArtifactSelect
                  run={runMap[runId]}
                  data={configs}
                  setExpandedGraph={(config) => setExpandedGraph(config)}
                  expandedGraph={expandedGraph}
                  renderArtifact={renderMarkdownWithSize}
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
export default MarkdownCompare;

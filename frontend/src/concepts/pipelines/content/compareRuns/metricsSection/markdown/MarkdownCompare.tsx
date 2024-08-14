import * as React from 'react';
import {
  Alert,
  Bullseye,
  Divider,
  Flex,
  FlexItem,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { CompareRunsEmptyState } from '~/concepts/pipelines/content/compareRuns/CompareRunsEmptyState';
import { PipelineRunArtifactSelect } from '~/concepts/pipelines/content/compareRuns/metricsSection/PipelineRunArtifactSelect';
import MarkdownView from '~/components/MarkdownView';
import { MAX_STORAGE_OBJECT_SIZE } from '~/services/storageService';
import { bytesAsRoundedGiB } from '~/utilities/number';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { CompareRunsNoMetrics } from '~/concepts/pipelines/content/compareRuns/CompareRunsNoMetrics';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

type MarkdownCompareProps = {
  configMap: Record<string, MarkdownAndTitle[]>;
  runMap: Record<string, PipelineRunKFv2>;
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
  const isArtifactApiAvailable = useIsAreaAvailable(SupportedArea.ARTIFACT_API).status;
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
      {config.fileSize && config.fileSize > MAX_STORAGE_OBJECT_SIZE && (
        <StackItem data-testid="markdown-oversized-warning">
          <Alert isInline variant="warning" title="Oversized file">
            {`This file is ${bytesAsRoundedGiB(
              config.fileSize,
            )} GiB in size but we do not fetch files over 100MB. To view the full file, please download it from your S3 bucket.`}
          </Alert>
        </StackItem>
      )}
      <StackItem>
        {isArtifactApiAvailable ? (
          <iframe data-testid="markdown-compare" src={config.config} title="markdown view" />
        ) : (
          <MarkdownView markdown={config.config} />
        )}
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

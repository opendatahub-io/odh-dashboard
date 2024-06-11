import * as React from 'react';
import {
  Alert,
  Bullseye,
  Divider,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Spinner,
  Stack,
  StackItem,
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
import MarkdownView from '~/components/MarkdownView';
import {
  MAX_STORAGE_OBJECT_SIZE,
  fetchStorageObject,
  fetchStorageObjectSize,
} from '~/services/storageService';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { extractS3UriComponents } from '~/concepts/pipelines/content/artifacts/utils';
import { bytesAsRoundedGiB } from '~/utilities/number';

type MarkdownCompareProps = {
  runArtifacts?: RunArtifact[];
  isLoaded: boolean;
};

export type MarkdownAndTitle = {
  title: string;
  config: string;
  fileSize?: number;
};

const MarkdownCompare: React.FC<MarkdownCompareProps> = ({ runArtifacts, isLoaded }) => {
  const [expandedGraph, setExpandedGraph] = React.useState<MarkdownAndTitle | undefined>(undefined);
  const { namespace } = usePipelinesAPI();

  const fullArtifactPaths: FullArtifactPath[] = React.useMemo(() => {
    if (!runArtifacts) {
      return [];
    }

    return getFullArtifactPaths(runArtifacts);
  }, [runArtifacts]);

  const { configMap, runMap } = React.useMemo(() => {
    const configMapBuilder: Record<string, MarkdownAndTitle[]> = {};
    const runMapBuilder: Record<string, PipelineRunKFv2> = {};

    fullArtifactPaths
      .map((fullPath) => ({
        run: fullPath.run,
        title: getFullArtifactPathLabel(fullPath),
        uri: fullPath.linkedArtifact.artifact.getUri(),
      }))
      .filter((markdown) => !!markdown.uri)
      .forEach(async ({ uri, title, run }) => {
        const uriComponents = extractS3UriComponents(uri);
        if (!uriComponents) {
          return;
        }
        const sizeBytes = await fetchStorageObjectSize(namespace, uriComponents.path).catch(
          () => undefined,
        );
        const text = await fetchStorageObject(namespace, uriComponents.path).catch(() => null);

        if (text === null) {
          return;
        }

        runMapBuilder[run.run_id] = run;

        const config = {
          title,
          config: text,
          fileSize: sizeBytes,
        };

        if (run.run_id in configMapBuilder) {
          configMapBuilder[run.run_id].push(config);
        } else {
          configMapBuilder[run.run_id] = [config];
        }
      });

    return { configMap: configMapBuilder, runMap: runMapBuilder };
  }, [fullArtifactPaths, namespace]);

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
        <EmptyStateHeader titleText="No markdown artifacts" headingLevel="h4" />
        <EmptyStateBody>
          There are no markdown artifacts available on the selected runs.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  const renderMarkdownWithSize = (config: MarkdownAndTitle) => (
    <Stack hasGutter>
      {config.fileSize && config.fileSize > MAX_STORAGE_OBJECT_SIZE && (
        <StackItem>
          <Alert isInline variant="warning" title="Oversized file">
            {`This file is ${bytesAsRoundedGiB(
              config.fileSize,
            )} GiB in size but we do not fetch files over 100MB. To view the full file, please download it from your S3 bucket.`}
          </Alert>
        </StackItem>
      )}
      <StackItem>
        <MarkdownView markdown={config.config} />
      </StackItem>
    </Stack>
  );

  return (
    <div style={{ overflowX: 'auto' }}>
      {expandedGraph ? (
        <Bullseye>
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
              <FlexItem>
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

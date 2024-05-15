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
import MarkdownView from '~/components/MarkdownView';

type MarkdownCompareProps = {
  runArtifacts?: RunArtifact[];
  isLoaded: boolean;
};

export type MarkdownAndTitle = {
  title: string;
  config: string;
};

const MarkdownCompare: React.FC<MarkdownCompareProps> = ({ runArtifacts, isLoaded }) => {
  const [expandedGraph, setExpandedGraph] = React.useState<MarkdownAndTitle | undefined>(undefined);

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
        const data = uri; // TODO: fetch data from uri: https://issues.redhat.com/browse/RHOAIENG-7206

        runMapBuilder[run.run_id] = run;

        const config = {
          title,
          config: data,
        };

        if (run.run_id in configMapBuilder) {
          configMapBuilder[run.run_id].push(config);
        } else {
          configMapBuilder[run.run_id] = [config];
        }
      });

    return { configMap: configMapBuilder, runMap: runMapBuilder };
  }, [fullArtifactPaths]);

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

  return (
    <div style={{ overflowX: 'auto' }}>
      {expandedGraph ? (
        <Bullseye>
          <PipelineRunArtifactSelect
            data={[expandedGraph]}
            setExpandedGraph={(config) => setExpandedGraph(config)}
            expandedGraph={expandedGraph}
            renderArtifact={(config) => <MarkdownView markdown={config.config} />}
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
                  renderArtifact={(config) => <MarkdownView markdown={config.config} />}
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

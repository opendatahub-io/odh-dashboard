import { Alert, AlertActionCloseButton, Stack, StackItem } from '@patternfly/react-core';
import React from 'react';
import { useParams } from 'react-router';
import { useAutoragResultsContext } from '~/app/context/AutoragResultsContext';
import { isTaskSucceeded } from '~/app/hooks/useComponentStageMap';
import { fetchS3File } from '~/app/hooks/queries';
import { useTreeViewData } from '~/app/topology/tree-view';
import { transformPipelineData } from '~/app/topology/tree-view/transformPipelineData';
import { useAutoragTaskTopology } from '~/app/topology/useAutoragTaskTopology';
import { buildStageMapTopology } from '~/app/topology/buildStageMapTopology';
import type { RunDetailsKF } from '~/app/types/pipeline';
import {
  computePatternRankMap,
  downloadBlob,
  getOptimizedMetricForRAG,
  isRunInTerminalState,
  normalizePipelineRunState,
  sanitizeFilename,
} from '~/app/utilities/utils';
import type { PipelineTreeLoadingMode } from './pipelineStatusLabels';
import AutoragLeaderboard from './AutoragLeaderboard';
import AutoragPipelineVisualization from './AutoragPipelineVisualization';
import './AutoragResults.scss';

const PatternDetailsModal = React.lazy(() => import('./PatternDetailsModal/PatternDetailsModal'));

type AutoragResultsProps = {
  onTryPattern?: (patternName: string) => void;
  onViewCode?: (patternName: string) => void;
};

function AutoragResults({ onTryPattern, onViewCode }: AutoragResultsProps): React.JSX.Element {
  const { namespace } = useParams<{ namespace: string }>();
  const {
    pipelineRun,
    patterns,
    patternsLoading,
    ragPatternsBasePath,
    componentStageMap,
    componentStageMapLoading,
    componentStageMapError,
    parameters,
    bestPatternKey,
  } = useAutoragResultsContext();
  const [selectedPatternName, setSelectedPatternName] = React.useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const runDetails = pipelineRun?.run_details as RunDetailsKF | undefined;

  const runState = React.useMemo(
    () => normalizePipelineRunState(pipelineRun?.state),
    [pipelineRun?.state],
  );

  const leaderboardPatternNames = React.useMemo(() => Object.keys(patterns), [patterns]);

  const stageMapNodes = React.useMemo(
    () =>
      componentStageMap
        ? buildStageMapTopology(
            componentStageMap,
            runDetails,
            runState,
            parameters?.optimization_max_rag_patterns,
            leaderboardPatternNames.length > 0 ? leaderboardPatternNames : undefined,
            patterns,
          )
        : [],
    [
      componentStageMap,
      runDetails,
      runState,
      parameters?.optimization_max_rag_patterns,
      leaderboardPatternNames,
      patterns,
    ],
  );
  const fallbackNodes = useAutoragTaskTopology(pipelineRun?.pipeline_spec, runDetails, runState);
  const pipelineSpec = pipelineRun?.pipeline_spec?.pipeline_spec ?? pipelineRun?.pipeline_spec;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- pipelineSpec shape varies at runtime
  const hasStageMapTask = Boolean(pipelineSpec?.root?.dag?.tasks?.['publish-component-stage-map']);
  const useStageMap = hasStageMapTask && !componentStageMapError;

  // Prefer stage-map nodes when transformable; otherwise keep showing pipeline_spec fallback.
  const treeSourceNodes = React.useMemo(() => {
    if (!(useStageMap && stageMapNodes.length > 0)) {
      return fallbackNodes;
    }
    const transformResult = transformPipelineData({ stageMapNodes });
    return transformResult.status === 'ok' ? stageMapNodes : fallbackNodes;
  }, [useStageMap, stageMapNodes, fallbackNodes]);

  const treeViewData = useTreeViewData(patterns, treeSourceNodes, bestPatternKey);

  const runIsTerminal = isRunInTerminalState(runState);
  const stageMapPublished = isTaskSucceeded(pipelineRun);
  const runId = pipelineRun?.run_id;
  const [readyRunId, setReadyRunId] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (readyRunId === runId || !useStageMap || !runId) {
      return;
    }

    const stageMapReady = Boolean(componentStageMap) && !componentStageMapLoading;
    const patternsReady = !runIsTerminal || !patternsLoading;

    if (stageMapReady && patternsReady) {
      setReadyRunId(runId);
    }
  }, [
    readyRunId,
    runId,
    useStageMap,
    componentStageMap,
    componentStageMapLoading,
    patternsLoading,
    runIsTerminal,
  ]);

  const treeLoadingMode = React.useMemo((): PipelineTreeLoadingMode | undefined => {
    if (!useStageMap) {
      return undefined;
    }
    if (!stageMapPublished && !runIsTerminal && !componentStageMap) {
      return 'preparing';
    }
    // Hold the initial tree behind the loader until status merges and patterns settle.
    // After that, background polling updates nodes in place without re-showing the loader.
    if (readyRunId !== runId) {
      const awaitingStageMap = !componentStageMap && componentStageMapLoading;
      const awaitingStabilization =
        Boolean(componentStageMap) &&
        (componentStageMapLoading || (runIsTerminal && patternsLoading));
      if (awaitingStageMap || awaitingStabilization) {
        return 'hydrating';
      }
    }
    return undefined;
  }, [
    useStageMap,
    componentStageMap,
    stageMapPublished,
    runIsTerminal,
    componentStageMapLoading,
    patternsLoading,
    readyRunId,
    runId,
  ]);

  const optimizedMetric = getOptimizedMetricForRAG(pipelineRun);

  const patternsArray = React.useMemo(() => Object.values(patterns), [patterns]);

  const rankMap = React.useMemo(() => computePatternRankMap(patternsArray), [patternsArray]);

  const selectedIndex = React.useMemo(
    () =>
      selectedPatternName !== null
        ? Math.max(
            0,
            patternsArray.findIndex((p) => p.name === selectedPatternName),
          )
        : 0,
    [selectedPatternName, patternsArray],
  );

  const [downloadError, setDownloadError] = React.useState<{
    patternName: string;
    message: string;
  } | null>(null);

  const handleViewDetails = React.useCallback((patternName: string) => {
    setSelectedPatternName(patternName);
  }, []);

  const handleSaveNotebook = React.useCallback(
    async (patternName: string, notebookType: 'indexing' | 'inference') => {
      setDownloadError(null);

      if (!namespace) {
        setDownloadError({
          patternName,
          message: 'Namespace is not available. Please try again.',
        });
        return;
      }

      if (!ragPatternsBasePath) {
        setDownloadError({
          patternName,
          message: 'Pattern base path is not available. Please try again.',
        });
        return;
      }

      const notebookFilenames: Record<string, string> = {
        indexing: 'indexing.ipynb',
        inference: 'inference.ipynb',
      };
      const notebookKey = `${ragPatternsBasePath}/${patternName}/${notebookFilenames[notebookType]}`;

      try {
        const notebook = await fetchS3File(namespace, notebookKey);
        const displayName = sanitizeFilename(pipelineRun?.display_name || 'pipeline');
        const safePatternName = sanitizeFilename(patternName);
        const filename = `${displayName}_${safePatternName}_${notebookType}_notebook.ipynb`;
        downloadBlob(notebook, filename);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        setDownloadError({
          patternName,
          message: `Failed to download ${notebookType} notebook: ${errorMessage}`,
        });
      }
    },
    [namespace, ragPatternsBasePath, pipelineRun?.display_name],
  );

  return (
    <>
      <Stack hasGutter>
        {downloadError && (
          <StackItem>
            <Alert
              variant="danger"
              title="Notebook download failed"
              actionClose={<AlertActionCloseButton onClose={() => setDownloadError(null)} />}
            >
              <strong>Pattern: {downloadError.patternName}</strong>
              <br />
              {downloadError.message}
            </Alert>
          </StackItem>
        )}
        <StackItem>
          <AutoragPipelineVisualization
            key={pipelineRun?.run_id}
            runTitle="AutoRAG pipeline run"
            runState={runState}
            treeViewData={treeViewData}
            treeLoadingMode={treeLoadingMode}
            componentStageMap={componentStageMap}
            pipelineRun={pipelineRun}
          />
        </StackItem>
        <StackItem>
          <AutoragLeaderboard
            onViewDetails={handleViewDetails}
            onSaveNotebook={handleSaveNotebook}
            onTryPattern={onTryPattern}
            onViewCode={onViewCode}
          />
        </StackItem>
      </Stack>
      {selectedPatternName !== null && patternsArray.length > 0 && (
        <React.Suspense fallback={null}>
          <PatternDetailsModal
            isOpen
            onClose={() => setSelectedPatternName(null)}
            patterns={patternsArray}
            selectedIndex={selectedIndex}
            rank={rankMap[patternsArray[selectedIndex]?.name] ?? 0}
            optimizedMetric={optimizedMetric}
            onPatternChange={(index) => setSelectedPatternName(patternsArray[index]?.name ?? null)}
            namespace={namespace}
            ragPatternsBasePath={ragPatternsBasePath}
            onSaveNotebook={handleSaveNotebook}
            onTryPattern={onTryPattern}
            onViewCode={onViewCode}
          />
        </React.Suspense>
      )}
    </>
  );
}

export default AutoragResults;

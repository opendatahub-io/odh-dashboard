import { Alert, AlertActionCloseButton, Stack, StackItem } from '@patternfly/react-core';
import React from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAutoragResultsContext } from '~/app/context/AutoragResultsContext';
import { isTaskSucceeded } from '~/app/hooks/useComponentStageMap';
import { useCreateIndexingPipelineRunMutation } from '~/app/hooks/mutations';
import { useNotification } from '~/app/hooks/useNotification';
import { fetchS3File, useManagedPipelinesQuery } from '~/app/hooks/queries';
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
import { buildIndexingPipelineRunRequest } from '~/app/utilities/indexingPipeline';
import {
  fireAutoragNotebookDownloaded,
  fireAutoragPatternDetailsViewed,
  type PlaygroundOpenedSource,
  type ViewCodeEntrySource,
} from '~/app/utilities/tracking';
import type { PipelineTreeLoadingMode } from './pipelineStatusLabels';
import AutoragLeaderboard from './AutoragLeaderboard';
import AutoragPipelineVisualization from './AutoragPipelineVisualization';
import RunIndexingPipelineModal from './RunIndexingPipelineModal';
import './AutoragResults.scss';

const PatternDetailsModal = React.lazy(() => import('./PatternDetailsModal/PatternDetailsModal'));

type AutoragResultsProps = {
  onTryPattern?: (patternName: string, source: PlaygroundOpenedSource) => void;
  onViewCode?: (patternName: string, source: ViewCodeEntrySource) => void;
};

function AutoragResults({ onTryPattern, onViewCode }: AutoragResultsProps): React.JSX.Element {
  const { namespace } = useParams<{ namespace: string }>();
  const navigate = useNavigate();
  const notification = useNotification();
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
  const [runIndexingPatternName, setRunIndexingPatternName] = React.useState<string | null>(null);
  const [runIndexingError, setRunIndexingError] = React.useState<string | null>(null);

  const {
    data: managedPipelines,
    isError: managedPipelinesQueryFailed,
    error: managedPipelinesQueryError,
  } = useManagedPipelinesQuery(namespace);
  const indexingPipelineAvailable = React.useMemo(
    () => managedPipelines?.some((pipeline) => pipeline.pipeline_type === 'indexing') ?? false,
    [managedPipelines],
  );

  React.useEffect(() => {
    if (!managedPipelinesQueryFailed) {
      return;
    }
    notification.warning(
      'Unable to check managed pipelines',
      managedPipelinesQueryError instanceof Error
        ? `Some features may not be available. ${managedPipelinesQueryError.message}`
        : 'Some features may not be available.',
    );
  }, [managedPipelinesQueryFailed, managedPipelinesQueryError, notification]);
  const createIndexingRunMutation = useCreateIndexingPipelineRunMutation(namespace ?? '');

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

  const runIndexingPattern = runIndexingPatternName ? patterns[runIndexingPatternName] : undefined;

  const [downloadError, setDownloadError] = React.useState<{
    patternName: string;
    message: string;
  } | null>(null);

  const handleViewDetails = React.useCallback((patternName: string) => {
    setSelectedPatternName(patternName);
    fireAutoragPatternDetailsViewed('resultsTable');
  }, []);

  const handleOpenRunIndexing = React.useCallback(
    (patternName: string) => {
      setRunIndexingError(null);
      createIndexingRunMutation.reset();
      setRunIndexingPatternName(patternName);
    },
    [createIndexingRunMutation],
  );

  const handleCloseRunIndexing = React.useCallback(() => {
    if (createIndexingRunMutation.isPending) {
      return;
    }
    setRunIndexingPatternName(null);
    setRunIndexingError(null);
  }, [createIndexingRunMutation.isPending]);

  const handleConfirmRunIndexing = React.useCallback(
    async ({ runName, description }: { runName: string; description?: string }) => {
      if (!namespace || !runIndexingPattern) {
        setRunIndexingError('Pattern or namespace is not available. Please try again.');
        return;
      }

      const requestOrError = buildIndexingPipelineRunRequest(
        runIndexingPattern,
        runName,
        description,
      );
      if ('error' in requestOrError) {
        setRunIndexingError(requestOrError.error);
        return;
      }

      setRunIndexingError(null);
      try {
        const run = await createIndexingRunMutation.mutateAsync(requestOrError);
        setRunIndexingPatternName(null);
        const runPath = `/develop-train/pipelines/runs/${namespace}/runs/${run.run_id}`;
        notification.success('Indexing pipeline run has been started', undefined, [
          {
            title: 'View run',
            onClick: () => navigate(runPath),
          },
        ]);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        setRunIndexingError(errorMessage);
      }
    },
    [namespace, runIndexingPattern, createIndexingRunMutation, notification, navigate],
  );

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
        fireAutoragNotebookDownloaded(notebookType);
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

  const runIndexingHandler = indexingPipelineAvailable ? handleOpenRunIndexing : undefined;

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
            onTryPattern={
              onTryPattern ? (patternName) => onTryPattern(patternName, 'resultsTable') : undefined
            }
            onViewCode={
              onViewCode ? (patternName) => onViewCode(patternName, 'resultsTable') : undefined
            }
            onRunIndexingPipeline={runIndexingHandler}
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
            onTryPattern={
              onTryPattern
                ? (patternName) => onTryPattern(patternName, 'patternDetails')
                : undefined
            }
            onViewCode={
              onViewCode ? (patternName) => onViewCode(patternName, 'patternDetails') : undefined
            }
            onRunIndexingPipeline={runIndexingHandler}
          />
        </React.Suspense>
      )}
      <RunIndexingPipelineModal
        isOpen={runIndexingPatternName !== null}
        onClose={handleCloseRunIndexing}
        onConfirm={handleConfirmRunIndexing}
        isSubmitting={createIndexingRunMutation.isPending}
        pattern={runIndexingPattern}
        sourceRunName={pipelineRun?.display_name}
        errorMessage={runIndexingError}
      />
    </>
  );
}

export default AutoragResults;

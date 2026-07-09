import { Alert, AlertActionCloseButton, Stack, StackItem } from '@patternfly/react-core';
import React from 'react';
import { useParams } from 'react-router';
import { useAutomlResultsContext } from '~/app/context/AutomlResultsContext';
import { isTaskSucceeded } from '~/app/hooks/useComponentStageMap';
import { fetchS3File } from '~/app/hooks/queries';
import { useTreeViewData } from '~/app/topology/tree-view';
import { useAutomlTaskTopology } from '~/app/topology/useAutomlTaskTopology';
import { buildStageMapTopology } from '~/app/topology/buildStageMapTopology';
import type { RunDetailsKF } from '~/app/types/pipeline';
import {
  downloadBlob,
  getBestModelFromStageMap,
  isRunInTerminalState,
  resolveBestModelKey,
} from '~/app/utilities/utils';
import type { PipelineTreeLoadingMode } from './pipelineStatusLabels';
import AutomlLeaderboard from './AutomlLeaderboard';
import AutomlModelDetailsModal from './AutomlModelDetailsModal/AutomlModelDetailsModal';
import AutomlPipelineVisualization from './AutomlPipelineVisualization';
import RegisterModelModal from './RegisterModelModal';
import './AutomlResults.scss';

type ModalState = {
  modelName: string;
  rank: number;
};

type NotebookDownloadError = {
  modelName: string;
  message: string;
};

function AutomlResults(): React.JSX.Element {
  const {
    pipelineRun,
    models,
    componentStageMap,
    componentStageMapLoading,
    componentStageMapError,
    parameters,
  } = useAutomlResultsContext();
  const { namespace } = useParams<{ namespace: string }>();

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const runDetails = pipelineRun?.run_details as RunDetailsKF | undefined;

  const stageMapNodes = React.useMemo(
    () =>
      componentStageMap
        ? buildStageMapTopology(
            componentStageMap,
            runDetails,
            pipelineRun?.state,
            parameters?.top_n,
          )
        : [],
    [componentStageMap, runDetails, pipelineRun?.state, parameters?.top_n],
  );
  const fallbackNodes = useAutomlTaskTopology(pipelineRun?.pipeline_spec, runDetails);
  const pipelineSpec = pipelineRun?.pipeline_spec?.pipeline_spec ?? pipelineRun?.pipeline_spec;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- pipelineSpec shape varies at runtime
  const hasStageMapTask = Boolean(pipelineSpec?.root?.dag?.tasks?.['publish-component-stage-map']);
  const useStageMap = hasStageMapTask && !componentStageMapError;

  const bestModelKey = React.useMemo(
    () => resolveBestModelKey(models, getBestModelFromStageMap(componentStageMap)),
    [models, componentStageMap],
  );

  // Tree view data
  const treeViewData = useTreeViewData(
    models,
    pipelineRun?.state,
    useStageMap && stageMapNodes.length > 0 ? stageMapNodes : fallbackNodes,
    bestModelKey,
  );

  const runIsTerminal = isRunInTerminalState(pipelineRun?.state);
  const stageMapPublished = isTaskSucceeded(pipelineRun);
  const treeLoadingMode = React.useMemo((): PipelineTreeLoadingMode | undefined => {
    if (!useStageMap) {
      return undefined;
    }
    if (!stageMapPublished && !runIsTerminal) {
      return 'preparing';
    }
    // Only block the tree until the initial stage map fetch completes. Background status
    // merges during polling should update nodes in place without re-showing the loader.
    if (!componentStageMap && (componentStageMapLoading || stageMapPublished)) {
      return 'hydrating';
    }
    return undefined;
  }, [useStageMap, componentStageMap, stageMapPublished, runIsTerminal, componentStageMapLoading]);
  const [modalState, setModalState] = React.useState<ModalState | null>(null);
  const [registerModelName, setRegisterModelName] = React.useState<string | null>(null);
  const [downloadError, setDownloadError] = React.useState<NotebookDownloadError | null>(null);

  const handleViewDetails = React.useCallback((modelName: string, rank: number) => {
    setModalState({ modelName, rank });
  }, []);

  const handleRegisterModel = React.useCallback((modelName: string) => {
    setRegisterModelName(modelName);
  }, []);

  const sanitizeFilename = (str: string): string =>
    str
      // Replace invalid filename characters with underscores
      // Invalid chars: < > : " / \ | ? * and control characters
      // eslint-disable-next-line no-control-regex
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/_{2,}/g, '_') // Collapse multiple underscores
      .replace(/^[.\s]+|[.\s]+$/g, '') // Remove leading/trailing dots and spaces
      .trim() || 'unknown';

  const handleSaveNotebook = React.useCallback(
    async (modelName: string) => {
      // Clear any previous errors
      setDownloadError(null);

      if (!namespace) {
        setDownloadError({
          modelName,
          message: 'Namespace is not available. Please try again.',
        });
        return;
      }

      const model = models[modelName];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- models is Record<string,T> which can have undefined values at runtime
      if (!model) {
        setDownloadError({
          modelName,
          message: 'Model not found. The model may have been removed or is not available.',
        });
        return;
      }

      const notebookKey = model.location.notebook;
      if (!notebookKey) {
        setDownloadError({
          modelName,
          message: 'Notebook location is not available for this model.',
        });
        return;
      }

      try {
        const notebook = await fetchS3File(namespace, notebookKey);
        const displayName = sanitizeFilename(pipelineRun?.display_name || 'pipeline');
        const safeModelName = sanitizeFilename(modelName);
        const notebookFilename = `${displayName}_${safeModelName}_notebook.ipynb`;
        downloadBlob(notebook, notebookFilename);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        setDownloadError({
          modelName,
          message: `Failed to download notebook: ${errorMessage}`,
        });
      }
    },
    [namespace, models, pipelineRun?.display_name],
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
              <strong>Model: {downloadError.modelName}</strong>
              <br />
              {downloadError.message}
            </Alert>
          </StackItem>
        )}
        <StackItem>
          <AutomlPipelineVisualization
            key={pipelineRun?.run_id}
            runTitle="AutoML pipeline run"
            runState={pipelineRun?.state}
            treeViewData={treeViewData}
            treeLoadingMode={treeLoadingMode}
            componentStageMap={componentStageMap}
            pipelineRun={pipelineRun}
          />
        </StackItem>
        <StackItem>
          <AutomlLeaderboard
            onViewDetails={handleViewDetails}
            onClickSaveNotebook={handleSaveNotebook}
            onRegisterModel={handleRegisterModel}
          />
        </StackItem>
      </Stack>
      {modalState && (
        <AutomlModelDetailsModal
          isOpen
          onClose={() => setModalState(null)}
          modelName={modalState.modelName}
          rank={modalState.rank}
          onClickSaveNotebook={handleSaveNotebook}
          onRegisterModel={handleRegisterModel}
        />
      )}
      {registerModelName && (
        <RegisterModelModal
          onClose={() => setRegisterModelName(null)}
          modelName={registerModelName}
        />
      )}
    </>
  );
}

export default AutomlResults;

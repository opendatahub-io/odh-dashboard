import { Stack, StackItem, Alert, AlertActionCloseButton } from '@patternfly/react-core';
import React from 'react';
import { useParams } from 'react-router';
import { useAutomlResultsContext } from '~/app/context/AutomlResultsContext';
import { fetchS3File } from '~/app/hooks/queries';
import PipelineTopology from '~/app/topology/PipelineTopology';
import { useAutoMLTaskTopology } from '~/app/topology/useAutoMLTaskTopology';
import type { RunDetailsKF } from '~/app/types/pipeline';
import { downloadBlob } from '~/app/utilities/utils';
import AutomlLeaderboard from './AutomlLeaderboard';
import AutomlModelDetailsModal from './AutomlModelDetailsModal/AutomlModelDetailsModal';
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
  const { pipelineRun, models } = useAutomlResultsContext();
  const { namespace } = useParams<{ namespace: string }>();

  const [selectedIds, setSelectedIds] = React.useState<string[] | undefined>();

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const runDetails = pipelineRun?.run_details as RunDetailsKF | undefined;

  const nodes = useAutoMLTaskTopology(pipelineRun?.pipeline_spec, runDetails, pipelineRun?.state);
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
          <PipelineTopology
            nodes={nodes}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            className="automl-topology-container"
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

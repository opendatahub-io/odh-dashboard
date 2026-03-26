import { Stack, StackItem } from '@patternfly/react-core';
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
import './AutomlResults.scss';

type ModalState = {
  modelName: string;
  rank: number;
};

function AutomlResults(): React.JSX.Element {
  const { pipelineRun, models } = useAutomlResultsContext();
  const { namespace } = useParams<{ namespace: string }>();

  const [selectedIds, setSelectedIds] = React.useState<string[] | undefined>();

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const runDetails = pipelineRun?.run_details as RunDetailsKF | undefined;

  const nodes = useAutoMLTaskTopology(pipelineRun?.pipeline_spec, runDetails);
  const [modalState, setModalState] = React.useState<ModalState | null>(null);

  const handleViewDetails = (modelName: string, rank: number) => {
    setModalState({ modelName, rank });
  };

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
      if (!namespace) {
        return;
      }

      const model = models[modelName];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- models is Record<string,T> which can have undefined values at runtime
      if (!model) {
        // eslint-disable-next-line no-console
        console.error(`Model not found: ${modelName}`);
        return;
      }

      const notebookKey = model.location.notebook;
      if (!notebookKey) {
        // eslint-disable-next-line no-console
        console.error(`Notebook key not found for model: ${modelName}`);
        return;
      }

      try {
        const notebook = await fetchS3File(namespace, notebookKey);
        const displayName = sanitizeFilename(pipelineRun?.display_name || 'pipeline');
        const safeModelName = sanitizeFilename(modelName);
        const notebookFilename = `${displayName}_${safeModelName}_notebook.ipynb`;
        downloadBlob(notebook, notebookFilename);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to download notebook:', error);
      }
    },
    [namespace, models, pipelineRun?.display_name],
  );

  return (
    <>
      <Stack hasGutter>
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
        />
      )}
    </>
  );
}

export default AutomlResults;

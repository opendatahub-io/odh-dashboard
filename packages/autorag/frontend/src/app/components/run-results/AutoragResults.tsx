import React from 'react';
import { Alert, AlertActionCloseButton, Stack, StackItem } from '@patternfly/react-core';
import { useParams } from 'react-router';
import PipelineTopology from '~/app/topology/PipelineTopology';
import { useAutoRAGTaskTopology } from '~/app/topology/useAutoRAGTaskTopology';
import type { RunDetailsKF } from '~/app/types/pipeline';
import { useAutoragResultsContext } from '~/app/context/AutoragResultsContext';
import { fetchS3File } from '~/app/hooks/queries';
import { downloadBlob, getOptimizedMetricForRAG, sanitizeFilename } from '~/app/utilities/utils';
import AutoragLeaderboard from './AutoragLeaderboard';
import './AutoragResults.scss';

const PatternDetailsModal = React.lazy(() => import('./PatternDetailsModal'));

function AutoragResults(): React.JSX.Element {
  const { namespace } = useParams<{ namespace: string }>();
  const { pipelineRun, patterns, ragPatternsBasePath } = useAutoragResultsContext();
  const [selectedIds, setSelectedIds] = React.useState<string[] | undefined>();
  const [selectedPatternName, setSelectedPatternName] = React.useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const runDetails = pipelineRun?.run_details as RunDetailsKF | undefined;

  const nodes = useAutoRAGTaskTopology(pipelineRun?.pipeline_spec, runDetails, pipelineRun?.state);
  const optimizedMetric = getOptimizedMetricForRAG(pipelineRun);

  const patternsArray = React.useMemo(() => Object.values(patterns), [patterns]);

  const rankMap = React.useMemo(() => {
    const sorted = patternsArray.toSorted((a, b) => b.final_score - a.final_score);
    const map: Record<string, number> = {};
    sorted.forEach((p, i) => {
      map[p.name] = i + 1;
    });
    return map;
  }, [patternsArray]);

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
          <PipelineTopology
            nodes={nodes}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            className="autorag-topology-container"
          />
        </StackItem>
        <StackItem>
          <AutoragLeaderboard
            onViewDetails={handleViewDetails}
            onSaveNotebook={handleSaveNotebook}
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
          />
        </React.Suspense>
      )}
    </>
  );
}

export default AutoragResults;

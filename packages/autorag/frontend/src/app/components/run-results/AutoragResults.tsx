import React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { useParams } from 'react-router';
import PipelineTopology from '~/app/topology/PipelineTopology';
import { useAutoRAGTaskTopology } from '~/app/topology/useAutoRAGTaskTopology';
import type { RunDetailsKF } from '~/app/types/pipeline';
import { useAutoragResultsContext } from '~/app/context/AutoragResultsContext';
import AutoragLeaderboard from './AutoragLeaderboard';
import PatternDetailsModal from './PatternDetailsModal';
import './AutoragResults.scss';

function AutoragResults(): React.JSX.Element {
  const { namespace } = useParams<{ namespace: string }>();
  const { pipelineRun, patterns, ragPatternsBasePath } = useAutoragResultsContext();
  const [selectedIds, setSelectedIds] = React.useState<string[] | undefined>();
  const [selectedPatternName, setSelectedPatternName] = React.useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const runDetails = pipelineRun?.run_details as RunDetailsKF | undefined;

  const nodes = useAutoRAGTaskTopology(pipelineRun?.pipeline_spec, runDetails);

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

  const handleViewDetails = React.useCallback((patternName: string) => {
    setSelectedPatternName(patternName);
  }, []);

  return (
    <>
      <Stack hasGutter>
        <StackItem>
          <PipelineTopology
            nodes={nodes}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            className="autorag-topology-container"
          />
        </StackItem>
        <StackItem>
          <AutoragLeaderboard onViewDetails={handleViewDetails} />
        </StackItem>
      </Stack>
      {selectedPatternName !== null && patternsArray.length > 0 && (
        <PatternDetailsModal
          isOpen
          onClose={() => setSelectedPatternName(null)}
          patterns={patternsArray}
          selectedIndex={selectedIndex}
          rank={rankMap[patternsArray[selectedIndex]?.name] ?? 0}
          onPatternChange={(index) => setSelectedPatternName(patternsArray[index]?.name ?? null)}
          namespace={namespace}
          ragPatternsBasePath={ragPatternsBasePath}
        />
      )}
    </>
  );
}

export default AutoragResults;

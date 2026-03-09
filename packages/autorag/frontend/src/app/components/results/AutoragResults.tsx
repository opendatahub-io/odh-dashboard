import { ExpandableSection, Spinner } from '@patternfly/react-core';
import React from 'react';

import { Stack, StackItem, Title } from '@patternfly/react-core';
import type { RunDetailsKF } from '~/app/types/pipeline';
import PipelineTopology from '~/app/topology/PipelineTopology';
import { useAutoRAGTaskTopology } from '~/app/topology/useAutoRAGTaskTopology';
import './AutoragResults.scss';
import { useParams } from 'react-router';
import { usePipelineRunQuery } from '~/app/hooks/queries';
import { isTerminalState } from '~/app/utilities/pipelineRunStates';

function AutoragResults(): React.JSX.Element {
  const [selectedIds, setSelectedIds] = React.useState<string[] | undefined>();
  const { namespace, runId } = useParams<{ namespace: string; runId: string }>();
  const [isExpanded, setIsExpanded] = React.useState(true);

  const { data: pipelineRun, error, isFetching } = usePipelineRunQuery(runId, namespace);
  const isPolling = isFetching && pipelineRun && !isTerminalState(pipelineRun.state);
  const runDetails = pipelineRun?.run_details as RunDetailsKF | undefined;
  const nodes = useAutoRAGTaskTopology(pipelineRun?.pipeline_spec, runDetails);

  // Show error in JSON if there's an error
  const errorData =
    error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { message: String(error) };
  const displayData = error ? { error: errorData } : pipelineRun;

  const currentState = error ? 'ERROR' : (pipelineRun?.state ?? 'LOADING');
  const parameters = pipelineRun?.runtime_config?.parameters ?? {};

  // Create toggle content with state and parameters
  const toggleContent = (
    <div style={{ textAlign: 'left' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
        Pipeline Run Status: {currentState}
      </div>
      {Object.keys(parameters).length > 0 && (
        <div style={{ fontSize: '0.9em', color: '#6a6e73' }}>
          {Object.entries(parameters).map(([key, value]) => (
            <div key={key} style={{ marginBottom: '4px' }}>
              <strong>{key}:</strong> {String(value)}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: '20px' }}>
      {isPolling && (
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Spinner size="md" />
          <span>Pipeline run in progress, polling for updates...</span>
        </div>
      )}
      <Stack hasGutter>
        <StackItem>
          <Title headingLevel="h2">{pipelineRun?.display_name} configurations</Title>
        </StackItem>
        <StackItem isFilled>
          <PipelineTopology
            nodes={nodes}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            className="autorag-topology-container"
          />
        </StackItem>
      </Stack>
      <ExpandableSection
        toggleContent={toggleContent}
        isExpanded={isExpanded}
        onToggle={(_event, expanded) => setIsExpanded(expanded)}
      >
        <pre
          style={{
            backgroundColor: '#f5f5f5',
            padding: '16px',
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '70vh',
          }}
        >
          {JSON.stringify(displayData, null, 2)}
        </pre>
      </ExpandableSection>
    </div>
  );
}

export default AutoragResults;

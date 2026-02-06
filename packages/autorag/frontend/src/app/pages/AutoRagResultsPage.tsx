import { ApplicationsPage } from 'mod-arch-shared';
import React from 'react';
import { useParams } from 'react-router';
import AutoRagResults from '../components/results/AutoRagResults';
import { useExperimentQuery, usePipelineRunQuery } from '../hooks/queries';
import InvalidPipelineRun from '../components/empty-states/InvalidPipelineRun';

function AutoRagResultsPage(): React.JSX.Element {
  const { runId } = useParams();

  const { data: pipelineRun, ...pipelineRunQuery } = usePipelineRunQuery(runId);
  const { data: experiment, ...experimentQuery } = useExperimentQuery(pipelineRun?.experiment_id);

  const invalidPipelineRunId = pipelineRunQuery.isError;

  return (
    <ApplicationsPage
      title={experiment?.display_name}
      empty={invalidPipelineRunId}
      emptyStatePage={<InvalidPipelineRun />}
      loadError={pipelineRunQuery.error ?? undefined}
      loaded={!pipelineRunQuery.isLoading && !experimentQuery.isLoading}
      provideChildrenPadding
      removeChildrenTopPadding
    >
      <AutoRagResults />
    </ApplicationsPage>
  );
}

export default AutoRagResultsPage;

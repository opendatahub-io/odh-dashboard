import { ApplicationsPage } from 'mod-arch-shared';
import React from 'react';
import { useParams } from 'react-router';
import AutoragResults from '../components/results/AutoragResults';
import { useExperimentQuery, usePipelineRunQuery } from '../hooks/queries';
import InvalidPipelineRun from '../components/empty-states/InvalidPipelineRun';

function AutoragResultsPage(): React.JSX.Element {
  const { runId } = useParams();

  const { data: pipelineRun, ...pipelineRunQuery } = usePipelineRunQuery(runId);
  const { data: experiment, ...experimentQuery } = useExperimentQuery(pipelineRun?.experiment_id);

  const invalidPipelineRunId = pipelineRunQuery.isError;

  return (
    <ApplicationsPage
      title={experiment?.display_name}
      empty={invalidPipelineRunId}
      emptyStatePage={<InvalidPipelineRun />}
      loadError={pipelineRunQuery.error ?? experimentQuery.error ?? undefined}
      loaded={pipelineRunQuery.isFetched && experimentQuery.isFetched}
      provideChildrenPadding
      removeChildrenTopPadding
    >
      <AutoragResults />
    </ApplicationsPage>
  );
}

export default AutoragResultsPage;

import { ApplicationsPage } from 'mod-arch-shared';
import React from 'react';
import { useParams } from 'react-router';
import AutomlResults from '~/app/components/results/AutomlResults';
import { useExperimentQuery, usePipelineRunQuery } from '~/app/hooks/queries';
import InvalidPipelineRun from '~/app/components/empty-states/InvalidPipelineRun';

function AutomlResultsPage(): React.JSX.Element {
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
      <AutomlResults />
    </ApplicationsPage>
  );
}

export default AutomlResultsPage;

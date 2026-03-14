import { ApplicationsPage, TitleWithIcon, ProjectObjectType } from 'mod-arch-shared';
import React from 'react';
import { useParams } from 'react-router';
import AutoragResults from '~/app/components/results/AutoragResults';
import { useExperimentQuery, usePipelineRunQuery } from '~/app/hooks/queries';
import InvalidPipelineRun from '~/app/components/empty-states/InvalidPipelineRun';

function AutoragResultsPage(): React.JSX.Element {
  const { namespace, runId } = useParams();

  const { data: pipelineRun, ...pipelineRunQuery } = usePipelineRunQuery(runId, namespace);
  const { ...experimentQuery } = useExperimentQuery(pipelineRun?.experiment_id);

  const invalidPipelineRunId = pipelineRunQuery.isError;

  return (
    <ApplicationsPage
      title={<TitleWithIcon title="AutoRAG" objectType={ProjectObjectType.pipelineExperiment} />}
      empty={invalidPipelineRunId}
      emptyStatePage={<InvalidPipelineRun />}
      loadError={pipelineRunQuery.error ?? experimentQuery.error ?? undefined}
      loaded={pipelineRunQuery.isFetched && experimentQuery.isFetched}
      provideChildrenPadding
      removeChildrenTopPadding
    >
      <AutoragResults pipelineRun={pipelineRun} />
    </ApplicationsPage>
  );
}

export default AutoragResultsPage;

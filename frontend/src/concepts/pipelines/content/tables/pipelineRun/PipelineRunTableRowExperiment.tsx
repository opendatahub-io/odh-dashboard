import React from 'react';
import { Skeleton } from '@patternfly/react-core';
import { Td } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import useExperimentById from '~/concepts/pipelines/apiHooks/useExperimentById';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { experimentRunsRoute } from '~/routes';

type PipelineRunTableRowExperimentProps = {
  experimentId: string;
};

const PipelineRunTableRowExperiment: React.FC<PipelineRunTableRowExperimentProps> = ({
  experimentId,
}) => {
  const { namespace } = usePipelinesAPI();
  const [experiment, isExperimentLoaded] = useExperimentById(experimentId);
  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;
  return (
    <Td dataLabel="Experiment">
      {!isExperimentLoaded ? (
        <Skeleton />
      ) : isExperimentsAvailable && experimentId ? (
        <Link to={experimentRunsRoute(namespace, experiment?.experiment_id)}>
          {experiment?.display_name}
        </Link>
      ) : (
        experiment?.display_name
      )}
    </Td>
  );
};

export default PipelineRunTableRowExperiment;

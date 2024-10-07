import React from 'react';
import { Skeleton } from '@patternfly/react-core';
import { Td } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { experimentRunsRoute } from '~/routes';
import { ExperimentKFv2 } from '~/concepts/pipelines/kfTypes';

type PipelineRunTableRowExperimentProps = {
  experiment: ExperimentKFv2 | null;
  loaded: boolean;
};

const PipelineRunTableRowExperiment: React.FC<PipelineRunTableRowExperimentProps> = ({
  experiment,
  loaded,
}) => {
  const { namespace } = usePipelinesAPI();
  return (
    <Td dataLabel="Experiment">
      {!loaded ? (
        <Skeleton />
      ) : (
        <Link to={experimentRunsRoute(namespace, experiment?.experiment_id)}>
          {experiment?.display_name}
        </Link>
      )}
    </Td>
  );
};

export default PipelineRunTableRowExperiment;

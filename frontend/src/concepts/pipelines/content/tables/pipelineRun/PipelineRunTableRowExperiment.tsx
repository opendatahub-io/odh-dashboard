import React from 'react';
import { Skeleton } from '@patternfly/react-core';
import { Td } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

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
  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;
  return (
    <Td dataLabel="Experiment">
      {!loaded ? (
        <Skeleton />
      ) : isExperimentsAvailable ? (
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

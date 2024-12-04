import React from 'react';
import { Skeleton } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { TableText } from '@patternfly/react-table';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { experimentRunsRoute } from '~/routes';
import { ExperimentKF } from '~/concepts/pipelines/kfTypes';
import { NoRunContent } from '~/concepts/pipelines/content/tables/renderUtils';

type PipelineRunTableRowExperimentProps = {
  experiment?: ExperimentKF | null;
  loaded: boolean;
  error?: Error;
};

const PipelineRunTableRowExperiment: React.FC<PipelineRunTableRowExperimentProps> = ({
  experiment,
  loaded,
  error,
}) => {
  const { namespace } = usePipelinesAPI();

  if (!loaded && !error) {
    return <Skeleton />;
  }

  if (!experiment) {
    return <NoRunContent />;
  }
  return (
    <Link to={experimentRunsRoute(namespace, experiment.experiment_id)}>
      <TableText wrapModifier="truncate">{experiment.display_name}</TableText>
    </Link>
  );
};

export default PipelineRunTableRowExperiment;

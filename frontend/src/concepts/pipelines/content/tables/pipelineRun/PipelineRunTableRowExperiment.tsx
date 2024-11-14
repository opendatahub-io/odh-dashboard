import React from 'react';
import { Skeleton, Tooltip } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { experimentRunsRoute } from '~/routes';
import { ExperimentKF } from '~/concepts/pipelines/kfTypes';
import { NoRunContent } from '~/concepts/pipelines/content/tables/renderUtils';

type PipelineRunTableRowExperimentProps = {
  displayName?: string;
  experiment?: ExperimentKF | null;
  loaded: boolean;
  error?: Error;
};

const PipelineRunTableRowExperiment: React.FC<PipelineRunTableRowExperimentProps> = ({
  displayName,
  experiment,
  loaded,
  error,
}) => {
  const { namespace } = usePipelinesAPI();

  if (error) {
    return (
      <Tooltip content={error.message} position="right">
        <div className="pf-v5-u-disabled-color-100 pf-v5-c-truncate__start">{displayName}</div>
      </Tooltip>
    );
  }

  if (!loaded) {
    return <Skeleton />;
  }

  if (!experiment) {
    return <NoRunContent />;
  }
  return (
    <Link to={experimentRunsRoute(namespace, experiment.experiment_id)}>
      {experiment.display_name}
    </Link>
  );
};

export default PipelineRunTableRowExperiment;

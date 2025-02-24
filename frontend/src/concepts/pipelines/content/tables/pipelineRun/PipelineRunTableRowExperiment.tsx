import React from 'react';
import { Label, Skeleton, Split, SplitItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { TableText } from '@patternfly/react-table';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { experimentRunsRoute } from '~/routes';
import { ExperimentKF } from '~/concepts/pipelines/kfTypes';
import { NoRunContent } from '~/concepts/pipelines/content/tables/renderUtils';

type PipelineRunTableRowExperimentProps = {
  experiment?: ExperimentKF | null;
  isExperimentArchived?: boolean;
  loaded: boolean;
  error?: Error;
};

const PipelineRunTableRowExperiment: React.FC<PipelineRunTableRowExperimentProps> = ({
  experiment,
  isExperimentArchived,
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
    <Split hasGutter>
      <SplitItem>
        <Link to={experimentRunsRoute(namespace, experiment.experiment_id)}>
          <TableText>{experiment.display_name}</TableText>
        </Link>
      </SplitItem>
      {isExperimentArchived && (
        <SplitItem>
          <Label isCompact>Archived</Label>
        </SplitItem>
      )}
    </Split>
  );
};

export default PipelineRunTableRowExperiment;

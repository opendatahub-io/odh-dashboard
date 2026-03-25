import React from 'react';
import { Label, Skeleton, Split, SplitItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { experimentRunsRoute } from '#~/routes/pipelines/experiments';
import { mlflowExperimentRoute } from '#~/routes/pipelines/mlflow';
import useIsAreaAvailable from '#~/concepts/areas/useIsAreaAvailable';
import { SupportedArea } from '#~/concepts/areas';
import { ExperimentKF } from '#~/concepts/pipelines/kfTypes';
import { NoRunContent } from '#~/concepts/pipelines/content/tables/renderUtils';
import TruncatedText from '#~/components/TruncatedText';

type PipelineRunTableRowExperimentProps = {
  experiment?: ExperimentKF | null;
  isExperimentArchived?: boolean;
  mlflowExperimentId?: string;
  loaded: boolean;
  error?: Error;
};

const PipelineRunTableRowExperiment: React.FC<PipelineRunTableRowExperimentProps> = ({
  experiment,
  isExperimentArchived,
  mlflowExperimentId,
  loaded,
  error,
}) => {
  const { namespace } = usePipelinesAPI();
  const isMLflowEnabled = useIsAreaAvailable(SupportedArea.MLFLOW).status;

  if (!loaded && !error) {
    return <Skeleton />;
  }

  if (!experiment) {
    return <NoRunContent />;
  }
  return (
    <Split hasGutter>
      <SplitItem>
        <Link
          to={
            isMLflowEnabled && mlflowExperimentId
              ? mlflowExperimentRoute(namespace, mlflowExperimentId)
              : experimentRunsRoute(namespace, experiment.experiment_id)
          }
        >
          <TruncatedText content={experiment.display_name} maxLines={1} />
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

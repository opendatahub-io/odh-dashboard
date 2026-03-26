import React from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@patternfly/react-core';
import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { mlflowExperimentRoute } from '#~/routes/pipelines/mlflow';
import { NoRunContent } from '#~/concepts/pipelines/content/tables/renderUtils';
import TruncatedText from '#~/components/TruncatedText';
import { MlflowExperimentData } from '#~/concepts/mlflow/types';
import { getMlflowExperimentNameFromRun } from '#~/concepts/pipelines/content/tables/pipelineRun/utils';

type PipelineRunTableRowMlflowExperimentProps = {
  run: PipelineRunKF;
  mlflow: MlflowExperimentData;
};

const PipelineRunTableRowMlflowExperiment: React.FC<PipelineRunTableRowMlflowExperimentProps> = ({
  run,
  mlflow,
}) => {
  const { namespace } = usePipelinesAPI();

  const experimentName = getMlflowExperimentNameFromRun(run);
  const experimentIdFromOutput = run.plugins_output?.mlflow?.entries.experiment_id?.value;
  const experimentId =
    experimentIdFromOutput ??
    (experimentName ? mlflow.experiments.find((e) => e.name === experimentName)?.id : undefined);

  if (!experimentName) {
    return <NoRunContent />;
  }

  if (!experimentIdFromOutput && !mlflow.loaded) {
    return <Skeleton />;
  }

  if (experimentId && typeof experimentId === 'string') {
    return (
      <Link
        to={mlflowExperimentRoute(experimentId, namespace)}
        data-testid="mlflow-experiment-link"
      >
        <TruncatedText content={experimentName} maxLines={1} />
      </Link>
    );
  }

  return <TruncatedText content={experimentName} maxLines={1} />;
};

export default PipelineRunTableRowMlflowExperiment;

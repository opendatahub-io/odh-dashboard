import React from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@patternfly/react-core';
import TruncatedText from '@odh-dashboard/ui-core/components/TruncatedText';
import { PipelineRecurringRunKF, PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { mlflowExperimentRoute } from '#~/routes/pipelines/mlflow';
import { MlflowTrackingEvents } from '#~/concepts/mlflow/const';
import { NoRunContent } from '#~/concepts/pipelines/content/tables/renderUtils';
import { MlflowExperimentData } from '#~/concepts/mlflow/types';
import { isPipelineRun } from '#~/concepts/pipelines/content/utils';
import {
  getMlflowExperimentId,
  getMlflowExperimentNameFromRun,
} from '#~/concepts/pipelines/content/tables/pipelineRun/utils';
import { fireLinkTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';

type PipelineRunTableRowMlflowExperimentProps = {
  run: PipelineRunKF | PipelineRecurringRunKF;
  mlflow: MlflowExperimentData;
};

const PipelineRunTableRowMlflowExperiment: React.FC<PipelineRunTableRowMlflowExperimentProps> = ({
  run,
  mlflow,
}) => {
  const { namespace } = usePipelinesAPI();

  const experimentIdFromRun = isPipelineRun(run) ? getMlflowExperimentId(run) : undefined;
  const experimentNameFromRun = getMlflowExperimentNameFromRun(run);

  const matchedExperiment =
    experimentIdFromRun != null
      ? mlflow.experiments.find((e) => e.id === experimentIdFromRun)
      : experimentNameFromRun
      ? mlflow.experiments.find((e) => e.name === experimentNameFromRun)
      : undefined;

  const experimentId = experimentIdFromRun ?? matchedExperiment?.id;
  const experimentName = matchedExperiment?.name ?? experimentNameFromRun;

  const handleExperimentClick = React.useCallback(() => {
    fireLinkTrackingEvent(MlflowTrackingEvents.EMBEDDED_VIEW_OPENED, {
      from: window.location.pathname,
      section: 'pipeline-run-table',
    });
  }, []);

  if (!mlflow.loaded && !mlflow.error && (experimentIdFromRun || experimentNameFromRun)) {
    return <Skeleton data-testid="mlflow-experiment-loading" />;
  }

  if (!experimentName) {
    return <NoRunContent />;
  }

  if (experimentId) {
    return (
      <Link
        to={mlflowExperimentRoute(experimentId, namespace)}
        data-testid="mlflow-experiment-link"
        onClick={handleExperimentClick}
      >
        <TruncatedText content={experimentName} maxLines={1} />
      </Link>
    );
  }

  return <TruncatedText content={experimentName} maxLines={1} />;
};

export default PipelineRunTableRowMlflowExperiment;

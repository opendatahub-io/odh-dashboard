import * as React from 'react';
import { Spinner, EmptyStateVariant, EmptyState, Truncate } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import {
  PipelineRecurringRunKF,
  PipelineRunKF,
  RecurringRunStatus,
} from '#~/concepts/pipelines/kfTypes';
import { getRunDuration, getRunStartTime } from '#~/concepts/pipelines/content/tables/utils';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { relativeDuration } from '#~/utilities/time';
import {
  asTimestamp,
  DetailItem,
  isEmptyDateKF,
  renderDetailItems,
} from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/utils';
import { isPipelineRun, isPipelineRecurringRun } from '#~/concepts/pipelines/content/utils';
import { PipelineVersionLink } from '#~/concepts/pipelines/content/PipelineVersionLink';
import usePipelineVersionById from '#~/concepts/pipelines/apiHooks/usePipelineVersionById';
import usePipelineById from '#~/concepts/pipelines/apiHooks/usePipelineById';
import { RecurringRunTrigger } from '#~/concepts/pipelines/content/tables/renderUtils';
import { Artifact } from '#~/third_party/mlmd';
import { getIsArtifactModelRegistered } from '#~/pages/pipelines/global/experiments/artifacts/utils';
import useIsMlflowPipelinesAvailable from '#~/concepts/mlflow/hooks/useIsMlflowPipelinesAvailable';
import {
  getMlflowRunId,
  getMlflowExperimentId,
  getMlflowExperimentNameFromRun,
} from '#~/concepts/pipelines/content/tables/pipelineRun/utils';
import { mlflowExperimentRoute, mlflowRunRoute } from '#~/routes/pipelines/mlflow';
import PipelineRunRegisteredModelDetails from './PipelineRunRegisteredModelDetails';
import { getArtifactModelData } from './artifacts/utils';

type PipelineRunTabDetailsProps = {
  run?: PipelineRunKF | PipelineRecurringRunKF | null;
  workflowName?: string;
  artifacts?: Artifact[];
};

const PipelineRunTabDetails: React.FC<PipelineRunTabDetailsProps> = ({
  run,
  workflowName,
  artifacts,
}) => {
  const { namespace, project } = usePipelinesAPI();
  const { available: isMlflowAvailable } = useIsMlflowPipelinesAvailable();
  const [version, versionLoaded, versionError] = usePipelineVersionById(
    run?.pipeline_version_reference?.pipeline_id,
    run?.pipeline_version_reference?.pipeline_version_id,
  );
  const [pipeline] = usePipelineById(run?.pipeline_version_reference?.pipeline_id);
  const { status: modelRegistryAvailable } = useIsAreaAvailable(SupportedArea.MODEL_REGISTRY);

  if (!run || !workflowName) {
    return (
      <EmptyState
        headingLevel="h4"
        titleText="Loading"
        variant={EmptyStateVariant.lg}
        data-id="loading-empty-state"
      >
        <Spinner size="xl" />
      </EmptyState>
    );
  }

  const artifactModelData = modelRegistryAvailable
    ? artifacts
        ?.filter((artifact) => getIsArtifactModelRegistered(artifact))
        .map((artifact) => getArtifactModelData(artifact))
    : undefined;

  const runId = isPipelineRun(run) ? run.run_id : run.recurring_run_id;

  const details: DetailItem[] = [
    { key: 'Name', value: <Truncate content={run.display_name} /> },
    {
      key: 'Project',
      value: <Link to={`/projects/${namespace}`}>{getDisplayNameFromK8sResource(project)}</Link>,
    },
    ...(versionError
      ? [{ key: 'Pipeline version', value: 'No pipeline version' }]
      : [
          {
            key: 'Pipeline version',
            value: (
              <PipelineVersionLink
                loadingIndicator={<Spinner size="sm" />}
                loaded={versionLoaded}
                version={version}
                error={versionError}
              />
            ),
          },
        ]),
    ...(pipeline
      ? [
          {
            key: 'Pipeline',
            value: pipeline.display_name,
          },
        ]
      : []),
    { key: 'Run ID', value: runId },
    { key: 'Workflow name', value: workflowName },
    ...(modelRegistryAvailable
      ? [
          {
            key: 'Registered models',
            value: (
              <>
                {artifactModelData?.length ? (
                  artifactModelData.map((data) => (
                    <PipelineRunRegisteredModelDetails
                      key={data.modelVersionId}
                      artifactModelData={data}
                    />
                  ))
                ) : (
                  <span>No model details available</span>
                )}
              </>
            ),
          },
        ]
      : []),
    ...((): DetailItem[] => {
      if (!isMlflowAvailable || !isPipelineRun(run)) {
        return [];
      }
      const mlflowExperimentName = getMlflowExperimentNameFromRun(run);
      const mlflowExperimentId = getMlflowExperimentId(run);
      const mlflowRunId = getMlflowRunId(run);
      const items: DetailItem[] = [];
      if (mlflowExperimentName && mlflowExperimentId) {
        items.push({
          key: 'MLflow experiment',
          value: (
            <Link
              to={mlflowExperimentRoute(mlflowExperimentId, namespace)}
              data-testid="mlflow-experiment-link"
            >
              {mlflowExperimentName}
            </Link>
          ),
        });
      }
      if (mlflowRunId && mlflowExperimentId) {
        items.push({
          key: 'MLflow run',
          value: (
            <Link
              to={mlflowRunRoute(mlflowExperimentId, mlflowRunId, namespace)}
              data-testid="mlflow-run-link"
            >
              {mlflowRunId}
            </Link>
          ),
        });
      }
      return items;
    })(),
    ...(!isPipelineRecurringRun(run)
      ? [
          {
            key: 'Started',
            value: asTimestamp(getRunStartTime(run)),
          },
          {
            key: 'Finished',
            value: isEmptyDateKF(run.finished_at) ? 'N/A' : asTimestamp(new Date(run.finished_at)),
          },
          { key: 'Duration', value: relativeDuration(getRunDuration(run)) },
        ]
      : [
          { key: 'Created', value: asTimestamp(new Date(run.created_at)) },
          {
            key: 'Run trigger enabled',
            value: run.status === RecurringRunStatus.ENABLED ? 'Yes' : 'No',
          },
          { key: 'Trigger', value: <RecurringRunTrigger recurringRun={run} /> },
        ]),
  ];

  return <>{renderDetailItems(details)}</>;
};

export default PipelineRunTabDetails;

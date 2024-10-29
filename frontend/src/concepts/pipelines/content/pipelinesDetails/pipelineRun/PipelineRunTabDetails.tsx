import * as React from 'react';
import {
  Spinner,
  EmptyStateVariant,
  EmptyState,
  EmptyStateHeader,
  Truncate,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import {
  PipelineRecurringRunKF,
  PipelineRunKF,
  RecurringRunStatus,
} from '~/concepts/pipelines/kfTypes';
import { getRunDuration } from '~/concepts/pipelines/content/tables/utils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { relativeDuration } from '~/utilities/time';
import {
  asTimestamp,
  DetailItem,
  isEmptyDateKF,
  renderDetailItems,
} from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/utils';
import { isPipelineRun, isPipelineRecurringRun } from '~/concepts/pipelines/content/utils';
import { PipelineVersionLink } from '~/concepts/pipelines/content/PipelineVersionLink';
import usePipelineVersionById from '~/concepts/pipelines/apiHooks/usePipelineVersionById';
import usePipelineById from '~/concepts/pipelines/apiHooks/usePipelineById';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { RecurringRunTrigger } from '~/concepts/pipelines/content/tables/renderUtils';

type PipelineRunTabDetailsProps = {
  run?: PipelineRunKF | PipelineRecurringRunKF | null;
  workflowName?: string;
};

const PipelineRunTabDetails: React.FC<PipelineRunTabDetailsProps> = ({ run, workflowName }) => {
  const { namespace, project } = usePipelinesAPI();
  const [version, versionLoaded, versionError] = usePipelineVersionById(
    run?.pipeline_version_reference?.pipeline_id,
    run?.pipeline_version_reference?.pipeline_version_id,
  );
  const [pipeline] = usePipelineById(run?.pipeline_version_reference?.pipeline_id);

  if (!run || !workflowName) {
    return (
      <EmptyState variant={EmptyStateVariant.lg} data-id="loading-empty-state">
        <Spinner size="xl" />
        <EmptyStateHeader titleText="Loading" headingLevel="h4" />
      </EmptyState>
    );
  }

  const runId = isPipelineRun(run) ? run.run_id : run.recurring_run_id;

  const details: DetailItem[] = [
    { key: 'Name', value: <Truncate content={run.display_name} /> },
    {
      key: 'Project',
      value: <Link to={`/projects/${namespace}`}>{getDisplayNameFromK8sResource(project)}</Link>,
    },
    ...(version
      ? [
          {
            key: 'Pipeline version',
            value: (
              <PipelineVersionLink
                displayName={version.display_name}
                loadingIndicator={<Spinner size="sm" />}
                loaded={versionLoaded}
                version={version}
                error={versionError}
              />
            ),
          },
        ]
      : versionError
      ? [{ key: 'Pipeline version', value: 'No pipeline version' }]
      : []),
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
    ...(!isPipelineRecurringRun(run)
      ? [
          { key: 'Started', value: asTimestamp(new Date(run.created_at)) },
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

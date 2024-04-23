import * as React from 'react';
import {
  Spinner,
  EmptyStateVariant,
  EmptyState,
  EmptyStateHeader,
  Truncate,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { PipelineRunJobKFv2, PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { getRunDuration } from '~/concepts/pipelines/content/tables/utils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { getProjectDisplayName } from '~/concepts/projects/utils';
import { relativeDuration } from '~/utilities/time';
import {
  asTimestamp,
  DetailItem,
  isEmptyDateKF,
  renderDetailItems,
} from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/utils';
import { isPipelineRun, isPipelineRunJob } from '~/concepts/pipelines/content/utils';
import { PipelineVersionLink } from '~/concepts/pipelines/content/PipelineVersionLink';
import usePipelineVersionById from '~/concepts/pipelines/apiHooks/usePipelineVersionById';

type PipelineRunTabDetailsProps = {
  pipelineRunKF?: PipelineRunKFv2 | PipelineRunJobKFv2;
  workflowName?: string;
};

const PipelineRunTabDetails: React.FC<PipelineRunTabDetailsProps> = ({
  pipelineRunKF,
  workflowName,
}) => {
  const { namespace, project } = usePipelinesAPI();
  const [version, loaded, error] = usePipelineVersionById(
    pipelineRunKF?.pipeline_version_reference?.pipeline_id,
    pipelineRunKF?.pipeline_version_reference?.pipeline_version_id,
  );

  if (!pipelineRunKF || !workflowName) {
    return (
      <EmptyState variant={EmptyStateVariant.lg} data-id="loading-empty-state">
        <Spinner size="xl" />
        <EmptyStateHeader titleText="Loading" headingLevel="h4" />
      </EmptyState>
    );
  }

  const runId = isPipelineRun(pipelineRunKF)
    ? pipelineRunKF.run_id
    : pipelineRunKF.recurring_run_id;

  const details: DetailItem[] = [
    { key: 'Name', value: <Truncate content={pipelineRunKF.display_name} /> },
    ...(version
      ? [
          {
            key: 'Pipeline version',
            value: (
              <PipelineVersionLink
                displayName={version.display_name}
                loadingIndicator={<Spinner size="sm" />}
                loaded={loaded}
                version={version}
                error={error}
              />
            ),
          },
        ]
      : []),
    {
      key: 'Project',
      value: <Link to={`/projects/${namespace}`}>{getProjectDisplayName(project)}</Link>,
    },
    { key: 'Run ID', value: runId },
    { key: 'Workflow name', value: workflowName },
    ...(!isPipelineRunJob(pipelineRunKF)
      ? [
          { key: 'Started', value: asTimestamp(new Date(pipelineRunKF.created_at)) },
          {
            key: 'Finished',
            value: isEmptyDateKF(pipelineRunKF.finished_at)
              ? 'N/A'
              : asTimestamp(new Date(pipelineRunKF.finished_at)),
          },
          { key: 'Duration', value: relativeDuration(getRunDuration(pipelineRunKF)) },
        ]
      : []),
  ];

  return <>{renderDetailItems(details)}</>;
};

export default PipelineRunTabDetails;

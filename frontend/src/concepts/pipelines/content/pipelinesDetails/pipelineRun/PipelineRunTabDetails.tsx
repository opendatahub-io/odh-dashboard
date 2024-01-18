import * as React from 'react';
import {
  Spinner,
  EmptyStateVariant,
  EmptyState,
  EmptyStateHeader,
  Truncate,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { PipelineRunJobKF, PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import {
  getPipelineVersionResourceRef,
  getRunDuration,
} from '~/concepts/pipelines/content/tables/utils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { getProjectDisplayName } from '~/pages/projects/utils';
import { relativeDuration } from '~/utilities/time';
import {
  asTimestamp,
  DetailItem,
  isEmptyDateKF,
  renderDetailItems,
} from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/utils';
import { isPipelineRunJob } from '~/concepts/pipelines/content/utils';
import { PipelineVersionLink } from '~/concepts/pipelines/content/PipelineVersionLink';
import usePipelineVersionById from '~/concepts/pipelines/apiHooks/usePipelineVersionById';

type PipelineRunTabDetailsProps = {
  pipelineRunKF?: PipelineRunKF | PipelineRunJobKF;
  workflowName?: string;
};

const PipelineRunTabDetails: React.FC<PipelineRunTabDetailsProps> = ({
  pipelineRunKF,
  workflowName,
}) => {
  const { namespace, project } = usePipelinesAPI();
  const versionRef = getPipelineVersionResourceRef(pipelineRunKF);
  const [version, loaded, error] = usePipelineVersionById(versionRef?.key.id);

  if (!pipelineRunKF || !workflowName) {
    return (
      <EmptyState variant={EmptyStateVariant.lg} data-id="loading-empty-state">
        <Spinner size="xl" />
        <EmptyStateHeader titleText="Loading" headingLevel="h4" />
      </EmptyState>
    );
  }

  const details: DetailItem[] = [
    { key: 'Name', value: <Truncate content={pipelineRunKF.name} /> },
    ...(versionRef
      ? [
          {
            key: 'Pipeline version',
            value: (
              <PipelineVersionLink
                displayName={versionRef.name}
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
    { key: 'Run ID', value: pipelineRunKF.id },
    { key: 'Workflow name', value: workflowName },
    ...(!isPipelineRunJob(pipelineRunKF)
      ? [
          { key: 'Created at', value: asTimestamp(new Date(pipelineRunKF.created_at)) },
          {
            key: 'Finished at',
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

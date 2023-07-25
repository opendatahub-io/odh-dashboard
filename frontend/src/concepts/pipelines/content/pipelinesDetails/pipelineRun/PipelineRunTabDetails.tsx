import * as React from 'react';
import {
  Spinner,
  EmptyStateVariant,
  EmptyState,
  Title,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import {
  getPipelineCoreResourcePipelineReference,
  getRunDuration,
} from '~/concepts/pipelines/content/tables/utils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { getProjectDisplayName } from '~/pages/projects/utils';
import { relativeDuration } from '~/utilities/time';
import {
  asTimestamp,
  DetailItem,
  renderDetailItems,
} from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/utils';
import PipelineDetailsTitle from '~/concepts/pipelines/content/pipelinesDetails/PipelineDetailsTitle';
import PipelineRunTypeLabel from '~/concepts/pipelines/content/PipelineRunTypeLabel';
import PipelineJobReferenceName from '~/concepts/pipelines/content/PipelineJobReferenceName';

type PipelineRunTabDetailsProps = {
  pipelineRunKF?: PipelineRunKF;
  workflowName?: string;
};

const PipelineRunTabDetails: React.FC<PipelineRunTabDetailsProps> = ({
  pipelineRunKF,
  workflowName,
}) => {
  const { namespace, project, getJobInformation } = usePipelinesAPI();

  if (!pipelineRunKF || !workflowName) {
    return (
      <EmptyState variant={EmptyStateVariant.large} data-id="loading-empty-state">
        <Spinner size="xl" />
        <Title headingLevel="h4" size="lg">
          Loading
        </Title>
      </EmptyState>
    );
  }

  const { data } = getJobInformation(pipelineRunKF);
  const pipelineReference =
    getPipelineCoreResourcePipelineReference(pipelineRunKF) ??
    getPipelineCoreResourcePipelineReference(data ?? undefined);

  const pipelineRef = pipelineReference
    ? [
        {
          key: 'Pipeline',
          // TODO: get the relative parent namespaced link
          value: (
            <Link to={`/pipelines/${namespace}/pipeline/view/${pipelineReference.key.id}`}>
              {pipelineReference.name}
            </Link>
          ),
        },
      ]
    : [];

  const jobRefDescription = data
    ? [
        {
          key: 'Description',
          value: (
            <>
              <PipelineJobReferenceName resource={pipelineRunKF} />
              {data.description ?? ''}
            </>
          ),
        },
      ]
    : null;
  const pipelineDescription = pipelineRunKF.description
    ? [
        {
          key: 'Description',
          value: pipelineRunKF.description,
        },
      ]
    : null;
  const description = (pipelineDescription || jobRefDescription) ?? [];

  const renderRunName = {
    key: 'Name',
    value: (
      <Split hasGutter>
        <SplitItem>
          <PipelineDetailsTitle run={pipelineRunKF} />{' '}
        </SplitItem>
        <SplitItem>
          <PipelineRunTypeLabel resource={pipelineRunKF} />
        </SplitItem>
      </Split>
    ),
  };
  const details: DetailItem[] = [
    renderRunName,
    ...description,
    ...pipelineRef,
    {
      key: 'Project',
      value: <Link to={`/projects/${namespace}`}>{getProjectDisplayName(project)}</Link>,
    },
    { key: 'Run ID', value: pipelineRunKF.id },
    { key: 'Workflow name', value: workflowName },
    { key: 'Created at', value: asTimestamp(new Date(pipelineRunKF.created_at)) },
    {
      key: 'Started at',
      value: asTimestamp(new Date(pipelineRunKF.scheduled_at || pipelineRunKF.created_at)),
    },
    { key: 'Finished at', value: asTimestamp(new Date(pipelineRunKF.finished_at)) },
    { key: 'Duration', value: relativeDuration(getRunDuration(pipelineRunKF)) },
  ];

  return <>{renderDetailItems(details)}</>;
};

export default PipelineRunTabDetails;

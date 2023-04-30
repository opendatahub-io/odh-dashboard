import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Icon,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Timestamp,
  TimestampFormat,
  Title,
} from '@patternfly/react-core';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import { GlobeAmericasIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import {
  getPipelineRunLikePipelineReference,
  getRunDuration,
} from '~/concepts/pipelines/content/tables/utils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { getProjectDisplayName } from '~/pages/projects/utils';
import { relativeDuration } from '~/utilities/time';

type PipelineRunTabDetailsProps = {
  pipelineRunKF?: PipelineRunKF;
};

type DetailItem = {
  key: string;
  value: React.ReactNode;
};

const PipelineRunTabDetails: React.FC<PipelineRunTabDetailsProps> = ({ pipelineRunKF }) => {
  const { namespace, project } = usePipelinesAPI();

  if (!pipelineRunKF) {
    return (
      <EmptyState>
        <EmptyStateIcon icon={ExclamationCircleIcon} />
        <Title headingLevel="h2" size="lg">
          Error with the run
        </Title>
        <EmptyStateBody>
          There was an issue trying to render the details information.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  const asTimestamp = (date: Date) => (
    <>
      <Icon size="sm">
        <GlobeAmericasIcon />
      </Icon>{' '}
      <Timestamp date={date} dateFormat={TimestampFormat.full} timeFormat={TimestampFormat.full} />
    </>
  );

  const pipelineReference = getPipelineRunLikePipelineReference(pipelineRunKF);
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

  const details: DetailItem[] = [
    { key: 'Name', value: pipelineRunKF.name },
    ...pipelineRef,
    {
      key: 'Project',
      value: <Link to={`/projects/${namespace}`}>{getProjectDisplayName(project)}</Link>,
    },
    { key: 'Run ID', value: pipelineRunKF.id },
    // { key: 'Workflow name', value: '?????' },
    { key: 'Created at', value: asTimestamp(new Date(pipelineRunKF.created_at)) },
    {
      key: 'Started at',
      value: asTimestamp(new Date(pipelineRunKF.scheduled_at || pipelineRunKF.created_at)),
    },
    { key: 'Finished at', value: asTimestamp(new Date(pipelineRunKF.finished_at)) },
    { key: 'Duration', value: relativeDuration(getRunDuration(pipelineRunKF)) },
  ];

  return (
    <Stack hasGutter>
      {details.map((detail) => (
        <StackItem key={detail.key}>
          <Split hasGutter>
            <SplitItem style={{ width: 150 }}>{detail.key}</SplitItem>
            <SplitItem isFilled>{detail.value}</SplitItem>
          </Split>
        </StackItem>
      ))}
      <StackItem>&nbsp;</StackItem>
    </Stack>
  );
};

export default PipelineRunTabDetails;

import React from 'react';
import { Link } from 'react-router-dom';

import { Truncate } from '@patternfly/react-core';

import { PipelineKF, PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';
import {
  asTimestamp,
  DetailItem,
  renderDetailItems,
} from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/utils';

type PipelineSummaryDescriptionListProps = {
  pipeline: PipelineKF | null;
  version: PipelineVersionKF | null;
};

export const PipelineSummaryDescriptionList: React.FC<PipelineSummaryDescriptionListProps> = ({
  pipeline,
  version,
}) => {
  if (!pipeline) {
    return null;
  }

  const details: DetailItem[] = [
    { key: 'Pipeline ID', value: <Truncate content={pipeline.pipeline_id} /> },
    ...(version
      ? [
          {
            key: 'Version ID',
            value: version.pipeline_version_id,
          },
        ]
      : []),
    ...(version?.code_source_url
      ? [
          {
            key: 'Version source',
            value: <Link to={version.code_source_url}>{version.code_source_url}</Link>,
          },
        ]
      : []),
    { key: 'Uploaded on', value: asTimestamp(new Date(pipeline.created_at)) },
    ...(pipeline.description ? [{ key: 'Pipeline description', value: pipeline.description }] : []),
  ];

  return renderDetailItems(details);
};

import React from 'react';
import { Link } from 'react-router-dom';

import { Skeleton, Tooltip } from '@patternfly/react-core';

import usePipelineVersionById from '~/concepts/pipelines/apiHooks/usePipelineVersionById';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { ResourceReferenceKF } from '~/concepts/pipelines/kfTypes';
import { NoRunContent } from '~/concepts/pipelines/content/tables/renderUtils';

interface PipelineVersionLinkProps {
  resourceRef: ResourceReferenceKF | undefined;
  loadingIndicator?: React.ReactElement;
}

export const PipelineVersionLink: React.FC<PipelineVersionLinkProps> = ({
  resourceRef,
  loadingIndicator,
}) => {
  const { namespace } = usePipelinesAPI();
  const versionName = resourceRef?.name;
  const versionId = resourceRef?.key.id;
  const [version, isVersionLoaded, error] = usePipelineVersionById(versionId);

  if (!resourceRef) {
    return <NoRunContent />;
  }

  if (!isVersionLoaded && !error) {
    return loadingIndicator || <Skeleton />;
  }

  if (!version) {
    return (
      <Tooltip content={<div>&quot;{versionName}&quot; no longer exists.</div>} position="right">
        <div className="pf-v5-u-disabled-color-100 pf-v5-c-truncate__start">{versionName}</div>
      </Tooltip>
    );
  }

  return <Link to={`/pipelines/${namespace}/pipeline/view/${versionId}`}>{versionName}</Link>;
};

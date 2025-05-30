import { Breadcrumb } from '@patternfly/react-core';
import React from 'react';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import ComponentWithProjectLink from '#~/concepts/projects/ComponentWithProjectLink';

type PipelineContextBreadcrumbProps = {
  children: React.ReactNode;
  dataTestId?: string;
};

const PipelineContextBreadcrumb: React.FC<PipelineContextBreadcrumbProps> = ({
  children,
  dataTestId,
}) => {
  const { project } = usePipelinesAPI();

  return (
    <ComponentWithProjectLink project={project}>
      <Breadcrumb data-testid={dataTestId}>{children}</Breadcrumb>
    </ComponentWithProjectLink>
  );
};

export default PipelineContextBreadcrumb;

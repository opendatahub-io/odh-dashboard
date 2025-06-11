import React from 'react';
import { BreadcrumbDetailsComponentProps } from '#~/concepts/pipelines/content/types';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { globalPipelineRunDetailsRoute, globalPipelineRunsRoute } from '#~/routes/pipelines/runs';
import DuplicateRunPage from '#~/concepts/pipelines/content/createRun/DuplicateRunPage';

const GlobalPipelineDuplicateRunPage: BreadcrumbDetailsComponentProps = ({ breadcrumbPath }) => {
  const { namespace } = usePipelinesAPI();
  const contextPath = globalPipelineRunsRoute(namespace);

  return (
    <DuplicateRunPage
      breadcrumbPath={breadcrumbPath}
      contextPath={contextPath}
      detailsRedirect={(runId) => globalPipelineRunDetailsRoute(namespace, runId)}
    />
  );
};

export default GlobalPipelineDuplicateRunPage;

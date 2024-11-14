import React from 'react';
import { BreadcrumbDetailsComponentProps } from '~/concepts/pipelines/content/types';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { globalPipelineRunDetailsRoute, pipelineRunsBaseRoute } from '~/routes';
import DuplicateRunPage from '~/concepts/pipelines/content/createRun/DuplicateRunPage';

const GlobalPipelineDuplicateRunPage: BreadcrumbDetailsComponentProps = ({ breadcrumbPath }) => {
  const { namespace } = usePipelinesAPI();

  return (
    <DuplicateRunPage
      breadcrumbPath={breadcrumbPath}
      contextPath={pipelineRunsBaseRoute(namespace)}
      detailsRedirect={(runId) => globalPipelineRunDetailsRoute(namespace, runId)}
    />
  );
};

export default GlobalPipelineDuplicateRunPage;

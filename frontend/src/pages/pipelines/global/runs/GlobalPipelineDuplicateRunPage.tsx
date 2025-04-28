import React from 'react';
import { BreadcrumbDetailsComponentProps } from '~/concepts/pipelines/content/types';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { globalPipelineRunDetailsRoute, globalPipelineRunsRoute} from '~/routes';
import DuplicateRunPage from '~/concepts/pipelines/content/createRun/DuplicateRunPage';

const GlobalPipelineDuplicateRunPage: BreadcrumbDetailsComponentProps = ({ breadcrumbPath }) => {
  const { namespace } = usePipelinesAPI();

 const contextPath =globalPipelineRunsRoute(namespace);
 
//  console.log("44a sigh3; in global pipeline duplicate run page:", breadcrumbPath, contextPath, correctContextPath);
 
  return (
    <DuplicateRunPage
      breadcrumbPath={breadcrumbPath}
      contextPath={contextPath}
      detailsRedirect={(runId) => globalPipelineRunDetailsRoute(namespace, runId)}
    />
  );
};

export default GlobalPipelineDuplicateRunPage;

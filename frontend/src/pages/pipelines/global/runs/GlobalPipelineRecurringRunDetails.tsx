import React from 'react';
import { BreadcrumbDetailsComponentProps } from '#~/concepts/pipelines/content/types';
import { globalPipelineRecurringRunsRoute } from '#~/routes/pipelines/runs';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import PipelineRecurringRunDetails from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRecurringRun/PipelineRecurringRunDetails';

const GlobalPipelineRecurringRunDetails: BreadcrumbDetailsComponentProps = ({
  breadcrumbPath,
  setHomePath,
}) => {
  const { namespace } = usePipelinesAPI();
  const contextPath = globalPipelineRecurringRunsRoute(namespace);

  React.useEffect(() => {
    setHomePath(contextPath);
  }, [setHomePath, contextPath]);

  return <PipelineRecurringRunDetails breadcrumbPath={breadcrumbPath} contextPath={contextPath} />;
};

export default GlobalPipelineRecurringRunDetails;

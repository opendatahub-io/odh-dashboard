import React from 'react';
import { BreadcrumbDetailsComponentProps } from '~/concepts/pipelines/content/types';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import {
  globalPipelineRecurringRunDetailsRoute,
  globalPipelineRecurringRunsRoute,
} from '~/routes/pipelines/runs';
import DuplicateRecurringRunPage from '~/concepts/pipelines/content/createRun/DuplicateRecurringRunPage';

const GlobalPipelineDuplicateRecurringRunPage: BreadcrumbDetailsComponentProps = ({
  breadcrumbPath,
  setHomePath,
}) => {
  const { namespace } = usePipelinesAPI();
  const contextPath = globalPipelineRecurringRunsRoute(namespace);

  React.useEffect(() => {
    setHomePath(contextPath);
  }, [setHomePath, contextPath]);

  return (
    <DuplicateRecurringRunPage
      breadcrumbPath={breadcrumbPath}
      contextPath={contextPath}
      detailsRedirect={(recurringRunId) =>
        globalPipelineRecurringRunDetailsRoute(namespace, recurringRunId)
      }
    />
  );
};

export default GlobalPipelineDuplicateRecurringRunPage;

import React from 'react';
import CreateRunPage from '~/concepts/pipelines/content/createRun/CreateRunPage';
import { RunTypeOption } from '~/concepts/pipelines/content/createRun/types';
import { BreadcrumbDetailsComponentProps } from '~/concepts/pipelines/content/types';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { globalPipelineRecurringRunsRoute, globalPipelineRunsRoute } from '~/routes/pipelines/runs';

export const GlobalPipelineCreateRunPage: BreadcrumbDetailsComponentProps = ({
  breadcrumbPath,
  setHomePath,
}) => {
  const { namespace } = usePipelinesAPI();
  const contextPath = globalPipelineRunsRoute(namespace);

  React.useEffect(() => {
    setHomePath(contextPath);
  }, [setHomePath, contextPath]);

  return (
    <CreateRunPage
      breadcrumbPath={breadcrumbPath}
      contextPath={contextPath}
      runType={RunTypeOption.ONE_TRIGGER}
    />
  );
};

export const GlobalPipelineCreateRecurringRunPagePage: BreadcrumbDetailsComponentProps = ({
  breadcrumbPath,
  setHomePath,
}) => {
  const { namespace } = usePipelinesAPI();
  const contextPath = globalPipelineRecurringRunsRoute(namespace);

  React.useEffect(() => {
    setHomePath(contextPath);
  }, [setHomePath, contextPath]);

  return (
    <CreateRunPage
      breadcrumbPath={breadcrumbPath}
      contextPath={contextPath}
      runType={RunTypeOption.SCHEDULED}
    />
  );
};

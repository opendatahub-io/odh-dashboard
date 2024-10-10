import React from 'react';
import { PathProps } from '~/concepts/pipelines/content/types';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import {
  pipelineVersionRecurringRunDetailsRoute,
  pipelineVersionRecurringRunsRoute,
} from '~/routes';
import CloneRecurringRunPage from '~/concepts/pipelines/content/createRun/CloneRecurringRunPage';
import { PipelineVersionContext } from '~/pages/pipelines/global/pipelines/PipelineVersionContext';
import PipelineVersionDetailsBreadcrumb from './PipelineVersionDetailsBreadcrumb';
import PipelineVersionRecurringRunsBreadcrumb from './PipelineVersionRecurringRunsBreadcrumb';

const PipelineVersionCloneRecurringRunPage: React.FC<PathProps> = ({ breadcrumbPath }) => {
  const { pipeline, version } = React.useContext(PipelineVersionContext);
  const { namespace } = usePipelinesAPI();

  return (
    <CloneRecurringRunPage
      breadcrumbPath={[
        ...breadcrumbPath,
        <PipelineVersionDetailsBreadcrumb key="pipeline-version-details" />,
        <PipelineVersionRecurringRunsBreadcrumb key="pipeline-version-runs" />,
      ]}
      contextPath={pipelineVersionRecurringRunsRoute(
        namespace,
        version?.pipeline_id,
        version?.pipeline_version_id,
      )}
      contextPipeline={pipeline}
      contextPipelineVersion={version}
      detailsRedirect={(recurringRunId) =>
        pipelineVersionRecurringRunDetailsRoute(
          namespace,
          version?.pipeline_id,
          version?.pipeline_version_id,
          recurringRunId,
        )
      }
    />
  );
};

export default PipelineVersionCloneRecurringRunPage;

import React from 'react';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import { pipelineVersionRecurringRunsRoute } from '~/routes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineVersionContext } from '~/pages/pipelines/global/pipelines/PipelineVersionContext';
import PipelineRecurringRunDetails from '~/concepts/pipelines/content/pipelinesDetails/pipelineRecurringRun/PipelineRecurringRunDetails';
import PipelineVersionDetailsBreadcrumb from './PipelineVersionDetailsBreadcrumb';
import PipelineVersionRecurringRunsBreadcrumb from './PipelineVersionRecurringRunsBreadcrumb';

const PipelineVersionRecurringRunDetails: PipelineCoreDetailsPageComponent = ({
  breadcrumbPath,
}) => {
  const { version } = React.useContext(PipelineVersionContext);
  const { namespace } = usePipelinesAPI();
  return (
    <PipelineRecurringRunDetails
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
    />
  );
};

export default PipelineVersionRecurringRunDetails;

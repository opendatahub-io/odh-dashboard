import React from 'react';
import { BreadcrumbItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import CreateRunPage from '~/concepts/pipelines/content/createRun/CreateRunPage';
import { RunTypeOption } from '~/concepts/pipelines/content/createRun/types';
import { PathProps, PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { pipelineVersionRecurringRunsRoute, pipelineVersionRunsRoute } from '~/routes';
import { PipelineVersionContext } from '~/pages/pipelines/global/pipelines/PipelineVersionContext';
import PipelineVersionDetailsBreadcrumb from './PipelineVersionDetailsBreadcrumb';

const PipelineVersionCreateRunPageInner: React.FC<PathProps & { runType: RunTypeOption }> = ({
  breadcrumbPath,
  runType,
}) => {
  const { version, pipeline } = React.useContext(PipelineVersionContext);
  const { namespace } = usePipelinesAPI();

  const redirectLink =
    runType === RunTypeOption.SCHEDULED
      ? pipelineVersionRecurringRunsRoute(
          namespace,
          version?.pipeline_id,
          version?.pipeline_version_id,
        )
      : pipelineVersionRunsRoute(namespace, version?.pipeline_id, version?.pipeline_version_id);
  return (
    <CreateRunPage
      breadcrumbPath={[
        ...breadcrumbPath,
        <PipelineVersionDetailsBreadcrumb key="pipeline-version-details" />,
        <BreadcrumbItem isActive key="pipeline-version-runs">
          {version ? <Link to={redirectLink}>Runs</Link> : 'Loading...'}
        </BreadcrumbItem>,
      ]}
      contextPath={redirectLink}
      runType={runType}
      contextPipeline={pipeline}
      contextPipelineVersion={version}
    />
  );
};

export const PipelineVersionCreateRunPage: PipelineCoreDetailsPageComponent = (props) => (
  <PipelineVersionCreateRunPageInner runType={RunTypeOption.ONE_TRIGGER} {...props} />
);

export const PipelineVersionCreateRecurringRunPage: PipelineCoreDetailsPageComponent = (props) => (
  <PipelineVersionCreateRunPageInner runType={RunTypeOption.SCHEDULED} {...props} />
);

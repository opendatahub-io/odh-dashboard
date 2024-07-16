import React from 'react';
import { BreadcrumbItem, Truncate } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import { pipelineVersionDetailsRoute, pipelineVersionRecurringRunsRoute } from '~/routes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineVersionContext } from '~/pages/pipelines/global/pipelines/PipelineVersionContext';
import PipelineRecurringRunDetails from '~/concepts/pipelines/content/pipelinesDetails/pipelineRecurringRun/PipelineRecurringRunDetails';

const PipelineVersionRecurringRunDetails: PipelineCoreDetailsPageComponent = ({
  breadcrumbPath,
}) => {
  const { version } = React.useContext(PipelineVersionContext);
  const { namespace } = usePipelinesAPI();
  return (
    <PipelineRecurringRunDetails
      breadcrumbPath={[
        ...breadcrumbPath,
        <BreadcrumbItem isActive style={{ maxWidth: 300 }} key="pipeline-version-details">
          {version ? (
            <Link
              to={pipelineVersionDetailsRoute(
                namespace,
                version.pipeline_id,
                version.pipeline_version_id,
              )}
            >
              {/* TODO: Remove the custom className after upgrading to PFv6 */}
              <Truncate content={version.display_name} className="truncate-no-min-width" />
            </Link>
          ) : (
            'Loading...'
          )}
        </BreadcrumbItem>,
        <BreadcrumbItem isActive key="pipeline-version-runs">
          {version ? (
            <Link
              to={pipelineVersionRecurringRunsRoute(
                namespace,
                version.pipeline_id,
                version.pipeline_version_id,
              )}
            >
              Runs
            </Link>
          ) : (
            'Loading...'
          )}
        </BreadcrumbItem>,
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

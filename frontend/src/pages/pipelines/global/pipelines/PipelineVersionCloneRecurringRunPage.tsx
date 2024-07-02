import React from 'react';
import { BreadcrumbItem, Truncate } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { PathProps } from '~/concepts/pipelines/content/types';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import {
  pipelineVersionDetailsRoute,
  pipelineVersionRecurringRunDetailsRoute,
  pipelineVersionRecurringRunsRoute,
} from '~/routes';
import CloneRecurringRunPage from '~/concepts/pipelines/content/createRun/CloneRecurringRunPage';
import { PipelineVersionContext } from '~/pages/pipelines/global/pipelines/PipelineVersionContext';

const PipelineVersionCloneRecurringRunPage: React.FC<PathProps> = ({ breadcrumbPath }) => {
  const { pipeline, version } = React.useContext(PipelineVersionContext);
  const { namespace } = usePipelinesAPI();

  return (
    <CloneRecurringRunPage
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

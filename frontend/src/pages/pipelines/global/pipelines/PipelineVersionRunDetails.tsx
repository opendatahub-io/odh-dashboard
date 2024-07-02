import React from 'react';
import { BreadcrumbItem, Truncate } from '@patternfly/react-core';
import { Link, useParams } from 'react-router-dom';
import PipelineRunDetails from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDetails';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import {
  pipelineVersionArchivedRunsRoute,
  pipelineVersionDetailsRoute,
  pipelineVersionRunsRoute,
} from '~/routes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineVersionContext } from '~/pages/pipelines/global/pipelines/PipelineVersionContext';
import usePipelineRunById from '~/concepts/pipelines/apiHooks/usePipelineRunById';
import { StorageStateKF } from '~/concepts/pipelines/kfTypes';

const PipelineVersionRunDetails: PipelineCoreDetailsPageComponent = ({ breadcrumbPath }) => {
  const { runId } = useParams();
  const fetchedRun = usePipelineRunById(runId, true);
  const { version } = React.useContext(PipelineVersionContext);
  const { namespace } = usePipelinesAPI();
  const [run] = fetchedRun;
  const isRunArchived = run?.storage_state === StorageStateKF.ARCHIVED;
  return (
    <PipelineRunDetails
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
              to={
                isRunArchived
                  ? pipelineVersionArchivedRunsRoute(
                      namespace,
                      version.pipeline_id,
                      version.pipeline_version_id,
                    )
                  : pipelineVersionRunsRoute(
                      namespace,
                      version.pipeline_id,
                      version.pipeline_version_id,
                    )
              }
            >
              Runs
            </Link>
          ) : (
            'Loading...'
          )}
        </BreadcrumbItem>,
      ]}
      contextPath={pipelineVersionRunsRoute(
        namespace,
        version?.pipeline_id,
        version?.pipeline_version_id,
      )}
      fetchedRun={fetchedRun}
    />
  );
};

export default PipelineVersionRunDetails;

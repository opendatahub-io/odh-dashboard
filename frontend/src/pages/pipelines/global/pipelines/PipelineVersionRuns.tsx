import * as React from 'react';
import { Breadcrumb, BreadcrumbItem, Truncate } from '@patternfly/react-core';
import { Outlet, Link } from 'react-router-dom';
import {
  pipelineRunsPageDescription,
  pipelineRunsPageTitle,
} from '~/pages/pipelines/global/runs/const';
import PipelineCoreApplicationPage from '~/pages/pipelines/global/PipelineCoreApplicationPage';
import { pipelinesBaseRoute, pipelineVersionDetailsRoute } from '~/routes';
import { ProjectObjectType } from '~/concepts/design/utils';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import { PipelineVersionContext } from '~/pages/pipelines/global/pipelines/PipelineVersionContext';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

const PipelineVersionRuns: PipelineCoreDetailsPageComponent = ({ breadcrumbPath }) => {
  const { namespace } = usePipelinesAPI();
  const { version } = React.useContext(PipelineVersionContext);

  return (
    <PipelineCoreApplicationPage
      title={
        <TitleWithIcon title={pipelineRunsPageTitle} objectType={ProjectObjectType.pipelineRun} />
      }
      description={pipelineRunsPageDescription}
      getRedirectPath={pipelinesBaseRoute}
      overrideChildPadding
      breadcrumb={
        <Breadcrumb>
          {breadcrumbPath}
          <BreadcrumbItem isActive style={{ maxWidth: 300 }}>
            {version?.display_name ? (
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
          </BreadcrumbItem>
          <BreadcrumbItem isActive>Runs</BreadcrumbItem>
        </Breadcrumb>
      }
    >
      <Outlet />
    </PipelineCoreApplicationPage>
  );
};

export default PipelineVersionRuns;

import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, Truncate } from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import usePipelineVersionById from '~/concepts/pipelines/apiHooks/usePipelineVersionById';
import PipelineNotFound from '~/concepts/pipelines/content/pipelinesDetails/pipeline/PipelineNotFound';
import { routePipelineDetailsNamespace } from '~/routes';
import { ProjectObjectType } from '~/concepts/design/utils';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import GlobalPipelineRunsTab from './GlobalPipelineRunsTabs';
import { pipelineRunsPageDescription, pipelineRunsPageTitle } from './const';

const GlobalPipelineVersionRuns: PipelineCoreDetailsPageComponent = ({ breadcrumbPath }) => {
  const { namespace } = usePipelinesAPI();

  // get pipeline and version from url
  const { pipelineId, pipelineVersionId } = useParams();
  const [pipelineVersion, pipelineVersionLoaded, pipelineVersionLoadError] = usePipelineVersionById(
    pipelineId,
    pipelineVersionId,
  );

  if (pipelineVersionLoadError || !pipelineVersionId || !pipelineId) {
    const title = 'Pipeline version not found';

    return (
      <ApplicationsPage
        breadcrumb={
          <Breadcrumb>
            {breadcrumbPath}
            <BreadcrumbItem isActive>{title}</BreadcrumbItem>
          </Breadcrumb>
        }
        title={title}
        empty={false}
        loaded
      >
        <PipelineNotFound />
      </ApplicationsPage>
    );
  }

  return (
    <ApplicationsPage
      breadcrumb={
        <Breadcrumb>
          {breadcrumbPath}
          <BreadcrumbItem isActive style={{ maxWidth: 300 }}>
            <Link to={routePipelineDetailsNamespace(namespace, pipelineId, pipelineVersionId)}>
              <Truncate content={pipelineVersion?.display_name || 'Loading...'} />
            </Link>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>Runs</BreadcrumbItem>
        </Breadcrumb>
      }
      title={
        <TitleWithIcon title={pipelineRunsPageTitle} objectType={ProjectObjectType.pipelineRun} />
      }
      description={pipelineRunsPageDescription}
      empty={false}
      loaded={pipelineVersionLoaded}
    >
      <GlobalPipelineRunsTab />
    </ApplicationsPage>
  );
};

export default GlobalPipelineVersionRuns;

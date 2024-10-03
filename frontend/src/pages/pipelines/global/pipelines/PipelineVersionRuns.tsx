import * as React from 'react';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { Outlet } from 'react-router-dom';
import {
  pipelineRunsPageDescription,
  pipelineRunsPageTitle,
} from '~/pages/pipelines/global/runs/const';
import PipelineCoreApplicationPage from '~/pages/pipelines/global/PipelineCoreApplicationPage';
import { pipelinesBaseRoute } from '~/routes';
import { ProjectObjectType } from '~/concepts/design/utils';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import PipelineVersionDetailsBreadcrumb from './PipelineVersionDetailsBreadcrumb';

const PipelineVersionRuns: PipelineCoreDetailsPageComponent = ({ breadcrumbPath }) => (
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
        <PipelineVersionDetailsBreadcrumb />
        <BreadcrumbItem isActive>Runs</BreadcrumbItem>
      </Breadcrumb>
    }
  >
    <Outlet />
  </PipelineCoreApplicationPage>
);

export default PipelineVersionRuns;

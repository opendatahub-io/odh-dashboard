import * as React from 'react';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import RunPage from '~/concepts/pipelines/content/createRun/RunPage';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import ApplicationsPage from '~/pages/ApplicationsPage';

const CreateRunPage: PipelineCoreDetailsPageComponent = ({ breadcrumbPath, contextPath }) => (
  <ApplicationsPage
    title="Create run"
    description="Create a run from a pipeline."
    breadcrumb={
      <Breadcrumb>
        {breadcrumbPath}
        <BreadcrumbItem isActive>Create run</BreadcrumbItem>
      </Breadcrumb>
    }
    loaded
    empty={false}
  >
    <RunPage contextPath={contextPath} />
  </ApplicationsPage>
);

export default CreateRunPage;

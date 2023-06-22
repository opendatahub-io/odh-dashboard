import * as React from 'react';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import RunPage from '~/concepts/pipelines/content/createRun/RunPage';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import ApplicationsPage from '~/pages/ApplicationsPage';
import useCloneRunData from '~/concepts/pipelines/content/createRun/useCloneRunData';

const CloneRunPage: PipelineCoreDetailsPageComponent = ({ breadcrumbPath, contextPath }) => {
  const [resource, loaded, error] = useCloneRunData();

  return (
    <ApplicationsPage
      title={resource ? `Duplicate of ${resource.name}` : 'Loading...'}
      description={resource ? `Create a new run from ${resource.name}.` : ''}
      breadcrumb={
        <Breadcrumb>
          {breadcrumbPath}
          <BreadcrumbItem isActive>
            {resource ? `Duplicate of ${resource.name}` : 'Duplicate'}
          </BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={loaded}
      loadError={error}
      empty={false}
    >
      <RunPage cloneRun={resource ?? undefined} contextPath={contextPath} />
    </ApplicationsPage>
  );
};

export default CloneRunPage;

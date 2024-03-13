import * as React from 'react';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';

import RunPage from '~/concepts/pipelines/content/createRun/RunPage';
import { PathProps, PipelineRunSearchParam } from '~/concepts/pipelines/content/types';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { PipelineRunType } from '~/pages/pipelines/global/runs';
import { useGetSearchParamValues } from '~/utilities/useGetSearchParamValues';

const CreateRunPage: React.FC<PathProps> = ({ breadcrumbPath, contextPath }) => {
  const { runType } = useGetSearchParamValues([PipelineRunSearchParam.RunType]);
  const title = `${runType === PipelineRunType.Scheduled ? 'Schedule' : 'Create'} run`;

  return (
    <ApplicationsPage
      title={title}
      breadcrumb={
        <Breadcrumb>
          {breadcrumbPath}
          <BreadcrumbItem isActive>{title}</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
    >
      <RunPage contextPath={contextPath} testId="create-run-page" />
    </ApplicationsPage>
  );
};

export default CreateRunPage;

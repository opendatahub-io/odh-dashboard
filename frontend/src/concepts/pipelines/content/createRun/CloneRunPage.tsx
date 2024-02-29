import React from 'react';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';

import RunPage from '~/concepts/pipelines/content/createRun/RunPage';
import ApplicationsPage from '~/pages/ApplicationsPage';
import useCloneRunData from '~/concepts/pipelines/content/createRun/useCloneRunData';
import { PathProps, PipelineRunSearchParam } from '~/concepts/pipelines/content/types';
import { useGetSearchParamValues } from '~/utilities/useGetSearchParamValues';
import { PipelineRunType } from '~/pages/pipelines/global/runs';
import { runTypeCategory } from './types';

const CloneRunPage: React.FC<PathProps> = ({ breadcrumbPath, contextPath }) => {
  const [run, loaded, error] = useCloneRunData();
  const { runType } = useGetSearchParamValues([PipelineRunSearchParam.RunType]);
  const title = `Duplicate ${
    runTypeCategory[(runType as PipelineRunType) || PipelineRunType.Active]
  }`;

  return (
    <ApplicationsPage
      title={title}
      breadcrumb={
        <Breadcrumb>
          {breadcrumbPath}
          <BreadcrumbItem isActive>
            {run ? `Duplicate of ${run.display_name}` : 'Duplicate'}
          </BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={loaded}
      loadError={error}
      empty={false}
    >
      <RunPage cloneRun={run} contextPath={contextPath} testId="clone-run-page" />
    </ApplicationsPage>
  );
};

export default CloneRunPage;

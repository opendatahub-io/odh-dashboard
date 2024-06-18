import React from 'react';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';

import RunPage from '~/concepts/pipelines/content/createRun/RunPage';
import ApplicationsPage from '~/pages/ApplicationsPage';
import useCloneRunData from '~/concepts/pipelines/content/createRun/useCloneRunData';
import { PathProps, PipelineRunSearchParam } from '~/concepts/pipelines/content/types';
import { useGetSearchParamValues } from '~/utilities/useGetSearchParamValues';
import { PipelineRunType } from '~/pages/pipelines/global/runs';
import { asEnumMember } from '~/utilities/utils';
import { runTypeCategory } from './types';

const CloneRunPage: React.FC<PathProps> = ({ breadcrumbPath, contextPath }) => {
  const [run, loaded, error] = useCloneRunData();
  const { runType: runTypeString } = useGetSearchParamValues([PipelineRunSearchParam.RunType]);
  const runType = asEnumMember(runTypeString, PipelineRunType);
  const title = `Duplicate ${runTypeCategory[runType || PipelineRunType.ACTIVE]}`;

  return (
    <ApplicationsPage
      title={title}
      breadcrumb={
        <Breadcrumb>
          {breadcrumbPath(runType)}
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

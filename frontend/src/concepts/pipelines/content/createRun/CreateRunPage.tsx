import * as React from 'react';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';

import RunPage from '~/concepts/pipelines/content/createRun/RunPage';
import { PathProps } from '~/concepts/pipelines/content/types';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { RunTypeOption } from '~/concepts/pipelines/content/createRun/types';
import { ExperimentKFv2, PipelineKFv2, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';

type CreateRunPageProps = {
  runType: RunTypeOption;
  contextExperiment?: ExperimentKFv2 | null;
  contextPipeline?: PipelineKFv2 | null;
  contextPipelineVersion?: PipelineVersionKFv2 | null;
};

const CreateRunPage: React.FC<PathProps & CreateRunPageProps> = ({
  breadcrumbPath,
  contextPath,
  runType,
  ...props
}) => {
  const title = `Create ${runType === RunTypeOption.SCHEDULED ? 'schedule' : 'run'}`;

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
      <RunPage contextPath={contextPath} testId="create-run-page" runType={runType} {...props} />
    </ApplicationsPage>
  );
};

export default CreateRunPage;

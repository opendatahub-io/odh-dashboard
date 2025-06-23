import * as React from 'react';
import { BreadcrumbItem } from '@patternfly/react-core';
import RunPage from '#~/concepts/pipelines/content/createRun/RunPage';
import { PathProps } from '#~/concepts/pipelines/content/types';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { RunTypeOption } from '#~/concepts/pipelines/content/createRun/types';
import { ExperimentKF } from '#~/concepts/pipelines/kfTypes';
import PipelineContextBreadcrumb from '#~/concepts/pipelines/content/PipelineContextBreadcrumb';

type CreateRunPageProps = {
  runType: RunTypeOption;
  contextExperiment?: ExperimentKF | null;
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
        <PipelineContextBreadcrumb>
          {breadcrumbPath}
          <BreadcrumbItem isActive>{title}</BreadcrumbItem>
        </PipelineContextBreadcrumb>
      }
      loaded
      empty={false}
    >
      <RunPage contextPath={contextPath} testId="create-run-page" runType={runType} {...props} />
    </ApplicationsPage>
  );
};

export default CreateRunPage;

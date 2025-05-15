import * as React from 'react';
import { Breadcrumb, BreadcrumbItem, Label, Truncate } from '@patternfly/react-core';
import { Outlet } from 'react-router';
import {
  experimentRunsPageDescription,
  pipelineRunsPageTitle,
} from '~/pages/pipelines/global/runs/const';
import PipelineCoreApplicationPage from '~/pages/pipelines/global/PipelineCoreApplicationPage';
import PipelineRunVersionsContextProvider from '~/pages/pipelines/global/runs/PipelineRunVersionsContext';
import { ProjectObjectType } from '~/concepts/design/utils';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import {
  ExperimentContext,
  useContextExperimentArchivedOrDeleted,
} from '~/pages/pipelines/global/experiments/ExperimentContext';
import { experimentsBaseRoute } from '~/routes/pipelines/experiments';

const ExperimentPipelineRuns: PipelineCoreDetailsPageComponent = ({ breadcrumbPath }) => {
  const { experiment } = React.useContext(ExperimentContext);
  const { isExperimentArchived } = useContextExperimentArchivedOrDeleted();

  return (
    <PipelineCoreApplicationPage
      title={
        <TitleWithIcon title={pipelineRunsPageTitle} objectType={ProjectObjectType.pipelineRun} />
      }
      description={experimentRunsPageDescription}
      getRedirectPath={experimentsBaseRoute}
      overrideChildPadding
      breadcrumb={
        <Breadcrumb>
          {breadcrumbPath}
          <BreadcrumbItem>
            {/* TODO: Remove the custom className after upgrading to PFv6 */}
            <Truncate
              content={experiment?.display_name || 'Loading...'}
              className="truncate-no-min-width"
            />
          </BreadcrumbItem>
          {isExperimentArchived && <Label>Archived</Label>}
        </Breadcrumb>
      }
    >
      <PipelineRunVersionsContextProvider>
        <Outlet />
      </PipelineRunVersionsContextProvider>
    </PipelineCoreApplicationPage>
  );
};

export default ExperimentPipelineRuns;

import React from 'react';
import { Breadcrumb, BreadcrumbItem, Truncate } from '@patternfly/react-core';

import { useParams, Link } from 'react-router-dom';
import RunPage from '~/concepts/pipelines/content/createRun/RunPage';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { PathProps } from '~/concepts/pipelines/content/types';
import { ExperimentKF, PipelineKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import usePipelineRecurringRunById from '~/concepts/pipelines/apiHooks/usePipelineRecurringRunById';
import { RunTypeOption } from './types';

type DuplicateRecurringRunPageProps = {
  detailsRedirect: (recurringRunId: string) => string;
  contextExperiment?: ExperimentKF | null;
  contextPipeline?: PipelineKF | null;
  contextPipelineVersion?: PipelineVersionKF | null;
};

const DuplicateRecurringRunPage: React.FC<PathProps & DuplicateRecurringRunPageProps> = ({
  breadcrumbPath,
  contextPath,
  detailsRedirect,
  ...props
}) => {
  const { recurringRunId } = useParams();
  const [recurringRun, loaded, error] = usePipelineRecurringRunById(recurringRunId);

  return (
    <ApplicationsPage
      title="Duplicate schedule"
      breadcrumb={
        <Breadcrumb>
          {breadcrumbPath}
          <BreadcrumbItem isActive style={{ maxWidth: 300 }}>
            {recurringRun ? (
              <Link to={detailsRedirect(recurringRun.recurring_run_id)}>
                {/* TODO: Remove the custom className after upgrading to PFv6 */}
                <Truncate content={recurringRun.display_name} className="truncate-no-min-width" />
              </Link>
            ) : (
              'Loading...'
            )}
          </BreadcrumbItem>
          <BreadcrumbItem isActive>Duplicate schedule</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={loaded}
      loadError={error}
      empty={false}
    >
      <RunPage
        duplicateRun={recurringRun}
        contextPath={contextPath}
        runType={RunTypeOption.SCHEDULED}
        testId="duplicate-run-page"
        {...props}
      />
    </ApplicationsPage>
  );
};

export default DuplicateRecurringRunPage;

import * as React from 'react';
import { Link } from 'react-router-dom';
import { BreadcrumbItem } from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { getProjectDisplayName } from '~/concepts/projects/utils';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';
import { experimentRunsRoute, experimentSchedulesRoute, experimentsBaseRoute } from '~/routes';
import EnsureCompatiblePipelineServer from '~/concepts/pipelines/EnsureCompatiblePipelineServer';
import { useExperimentByParams } from './experiments/useExperimentByParams';

type GlobalPipelineCoreDetailsProps = {
  pageName: string;
  redirectPath: (namespace: string) => string;
  BreadcrumbDetailsComponent: PipelineCoreDetailsPageComponent;
};

const GlobalPipelineCoreDetails: React.FC<GlobalPipelineCoreDetailsProps> = ({
  pageName,
  redirectPath,
  BreadcrumbDetailsComponent,
}) => {
  const { namespace, project } = usePipelinesAPI();

  return (
    <EnsureAPIAvailability>
      <EnsureCompatiblePipelineServer>
        <BreadcrumbDetailsComponent
          breadcrumbPath={[
            <BreadcrumbItem
              key="home"
              render={() => (
                <Link to={redirectPath(namespace)}>
                  {pageName} - {getProjectDisplayName(project)}
                </Link>
              )}
            />,
          ]}
          contextPath={redirectPath(namespace)}
        />
      </EnsureCompatiblePipelineServer>
    </EnsureAPIAvailability>
  );
};

export const GlobalExperimentDetails: React.FC<
  Pick<GlobalPipelineCoreDetailsProps, 'BreadcrumbDetailsComponent'> & {
    isSchedule?: boolean;
  }
> = ({ BreadcrumbDetailsComponent, isSchedule }) => {
  const experiment = useExperimentByParams();
  const experimentId = experiment?.experiment_id;
  const { namespace, project } = usePipelinesAPI();

  return (
    <EnsureAPIAvailability>
      <EnsureCompatiblePipelineServer>
        <BreadcrumbDetailsComponent
          breadcrumbPath={[
            <BreadcrumbItem key="experiments">
              <Link to={experimentsBaseRoute(namespace)}>
                Experiments - {getProjectDisplayName(project)}
              </Link>
            </BreadcrumbItem>,
            <BreadcrumbItem key="experiment">
              {experiment?.display_name ? (
                <Link to={experimentRunsRoute(namespace, experimentId)}>
                  {experiment.display_name}
                </Link>
              ) : (
                'Loading...'
              )}
            </BreadcrumbItem>,
          ]}
          contextPath={
            isSchedule
              ? experimentSchedulesRoute(namespace, experimentId)
              : experimentRunsRoute(namespace, experimentId)
          }
        />
      </EnsureCompatiblePipelineServer>
    </EnsureAPIAvailability>
  );
};

export default GlobalPipelineCoreDetails;

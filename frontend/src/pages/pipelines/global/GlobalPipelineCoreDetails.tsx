import * as React from 'react';
import { Link } from 'react-router-dom';
import { BreadcrumbItem } from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';
import { experimentRunsRoute, experimentSchedulesRoute, experimentsBaseRoute } from '~/routes';
import EnsureCompatiblePipelineServer from '~/concepts/pipelines/EnsureCompatiblePipelineServer';
import { ExperimentRunsContext } from '~/pages/pipelines/global/experiments/ExperimentRunsContext';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';

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
          breadcrumbPath={() => [
            <BreadcrumbItem
              key="home"
              render={() => (
                <Link to={redirectPath(namespace)}>
                  {pageName} - {getDisplayNameFromK8sResource(project)}
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
  const { experiment } = React.useContext(ExperimentRunsContext);
  const experimentId = experiment?.experiment_id;
  const { namespace, project } = usePipelinesAPI();

  return (
    <EnsureAPIAvailability>
      <EnsureCompatiblePipelineServer>
        <BreadcrumbDetailsComponent
          breadcrumbPath={(runType) => [
            <BreadcrumbItem key="experiments">
              <Link to={experimentsBaseRoute(namespace)}>
                Experiments - {getDisplayNameFromK8sResource(project)}
              </Link>
            </BreadcrumbItem>,
            <BreadcrumbItem key="experiment">
              {experiment?.display_name ? (
                <Link to={experimentRunsRoute(namespace, experimentId, runType)}>
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

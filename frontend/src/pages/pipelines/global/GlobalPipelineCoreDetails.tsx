import * as React from 'react';
import { Link } from 'react-router-dom';
import { BreadcrumbItem } from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';
import { experimentsBaseRoute, pipelinesBaseRoute } from '~/routes';
import EnsureCompatiblePipelineServer from '~/concepts/pipelines/EnsureCompatiblePipelineServer';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';

type GlobalPipelineCoreDetailsProps = {
  pageName: string;
  redirectPath: (namespace: string) => string;
  BreadcrumbDetailsComponent: PipelineCoreDetailsPageComponent;
};

const GlobalPipelineCoreDetails: React.FC<GlobalPipelineCoreDetailsProps> = (props) => (
  <EnsureAPIAvailability>
    <EnsureCompatiblePipelineServer>
      <GlobalPipelineCoreDetailsInner {...props} />
    </EnsureCompatiblePipelineServer>
  </EnsureAPIAvailability>
);

const GlobalPipelineCoreDetailsInner: React.FC<GlobalPipelineCoreDetailsProps> = ({
  pageName,
  redirectPath,
  BreadcrumbDetailsComponent,
}) => {
  const { namespace, project } = usePipelinesAPI();

  return (
    <BreadcrumbDetailsComponent
      breadcrumbPath={[
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
  );
};

export const PipelineVersionCoreDetails: React.FC<
  Pick<GlobalPipelineCoreDetailsProps, 'BreadcrumbDetailsComponent'>
> = ({ BreadcrumbDetailsComponent }) => (
  <GlobalPipelineCoreDetailsInner
    pageName="Pipelines"
    redirectPath={pipelinesBaseRoute}
    BreadcrumbDetailsComponent={BreadcrumbDetailsComponent}
  />
);

export const ExperimentCoreDetails: React.FC<
  Pick<GlobalPipelineCoreDetailsProps, 'BreadcrumbDetailsComponent'>
> = ({ BreadcrumbDetailsComponent }) => (
  <GlobalPipelineCoreDetailsInner
    pageName="Experiments"
    redirectPath={experimentsBaseRoute}
    BreadcrumbDetailsComponent={BreadcrumbDetailsComponent}
  />
);

export default GlobalPipelineCoreDetails;

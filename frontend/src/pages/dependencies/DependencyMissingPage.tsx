import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import NotFound from '~/pages/NotFound';
import PipelinesDependencyMissing from '~/pages/dependencies/PipelinesDependencyMissing';
import { useAppContext } from '~/app/AppContext';

const DependencyMissingPage: React.FC = () => {
  const { dashboardConfig } = useAppContext();
  const { area } = useParams();
  const navigate = useNavigate();

  switch (area) {
    case 'pipelines':
      if (dashboardConfig.status.dependencyOperators.redhatOpenshiftPipelines.available) {
        // eslint-disable-next-line no-console
        console.warn(
          'The pipelines dependency has been met, this page will redirect to pipelines page.',
        );
        navigate('/pipelines');
        break;
      }
      return <PipelinesDependencyMissing />;
    default:
      // eslint-disable-next-line no-console
      console.error('Unknown area of the dependency missing screen', area);
  }

  return <NotFound />;
};

export default DependencyMissingPage;

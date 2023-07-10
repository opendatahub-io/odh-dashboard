import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { getInferenceServiceDisplayName } from '~/pages/modelServing/screens/global/utils';
import MetricsPage from '~/pages/modelServing/screens/metrics/MetricsPage';
import { ModelServingMetricsProvider } from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { getInferenceServiceMetricsQueries } from '~/pages/modelServing/screens/metrics/utils';
import NotFound from '~/pages/NotFound';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { getProjectDisplayName } from '~/pages/projects/utils';

const DetailsPageMetricsWrapper: React.FC = () => {
  const { namespace: projectName, inferenceService: modelName } = useParams<{
    namespace: string;
    inferenceService: string;
  }>();
  const {
    currentProject,
    inferenceServices: { data: models, loaded },
  } = React.useContext(ProjectDetailsContext);
  const inferenceService = models.find(
    (model) => model.metadata.name === modelName && model.metadata.namespace === projectName,
  );
  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }
  if (!inferenceService) {
    return <NotFound />;
  }
  const queries = getInferenceServiceMetricsQueries(inferenceService);
  const projectDisplayName = getProjectDisplayName(currentProject);
  const modelDisplayName = getInferenceServiceDisplayName(inferenceService);

  return (
    <ModelServingMetricsProvider queries={queries}>
      <MetricsPage
        title={`${projectDisplayName} - ${modelDisplayName} metrics`}
        breadcrumbItems={[
          { label: 'Data Science Projects', link: '/projects' },
          {
            label: projectDisplayName,
            link: `/projects/${currentProject.metadata.name}`,
          },
          {
            label: `${modelDisplayName} metrics`,
            isActive: true,
          },
        ]}
      />
    </ModelServingMetricsProvider>
  );
};

export default DetailsPageMetricsWrapper;

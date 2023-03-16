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
import InferenceGraphs from '~/pages/modelServing/screens/metrics/InferenceGraphs';
import { MetricType } from '~/pages/modelServing/screens/types';

const ProjectInferenceMetricsWrapper: React.FC = () => {
  const { inferenceService: modelName } = useParams<{
    inferenceService: string;
  }>();
  const {
    currentProject,
    inferenceServices: { data: models, loaded },
  } = React.useContext(ProjectDetailsContext);
  const inferenceService = models.find((model) => model.metadata.name === modelName);
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
    <ModelServingMetricsProvider queries={queries} type={MetricType.INFERENCE}>
      <MetricsPage
        title={`${modelDisplayName} metrics`}
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
      >
        <InferenceGraphs />
      </MetricsPage>
    </ModelServingMetricsProvider>
  );
};

export default ProjectInferenceMetricsWrapper;

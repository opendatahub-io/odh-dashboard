import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Bullseye, Spinner } from '@patternfly/react-core';
import NotFound from '~/pages/NotFound';
import { ModelServingContext } from '~/pages/modelServing/ModelServingContext';
import { getInferenceServiceDisplayName } from '~/pages/modelServing/screens/global/utils';
import InferenceGraphs from '~/pages/modelServing/screens/metrics/InferenceGraphs';
import { MetricType } from '~/pages/modelServing/screens/types';
import { ModelServingMetricsProvider } from './ModelServingMetricsContext';
import MetricsPage from './MetricsPage';
import { getInferenceServiceMetricsQueries } from './utils';

const GlobalInferenceMetricsWrapper: React.FC = () => {
  const { project: projectName, inferenceService: modelName } = useParams<{
    project: string;
    inferenceService: string;
  }>();
  const {
    inferenceServices: { data: models, loaded },
  } = React.useContext(ModelServingContext);
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
  const modelDisplayName = getInferenceServiceDisplayName(inferenceService);

  return (
    <ModelServingMetricsProvider queries={queries} type={MetricType.INFERENCE}>
      <MetricsPage
        title={`${modelDisplayName} metrics`}
        breadcrumbItems={[
          { label: 'Model serving', link: '/modelServing' },
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

export default GlobalInferenceMetricsWrapper;

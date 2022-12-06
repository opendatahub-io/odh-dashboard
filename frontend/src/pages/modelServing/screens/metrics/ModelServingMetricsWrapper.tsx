import * as React from 'react';
import { useParams } from 'react-router-dom';
import NotFound from '../../../NotFound';
import { ModelServingContext } from '../../ModelServingContext';
import { ModelServingMetricsProvider } from './ModelServingMetricsContext';
import { getInferenceServiceDisplayName } from '../global/utils';
import MetricsPage from './MetricsPage';
import { getInferenceServiceMetricsQueries } from './utils';
import { Bullseye, Spinner } from '@patternfly/react-core';

const ModelServingMetricsWrapper: React.FC = () => {
  const { project: projectName, inferenceService: modelName } =
    useParams<{ project: string; inferenceService: string }>();
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
    <ModelServingMetricsProvider queries={queries}>
      <MetricsPage
        title={`${modelDisplayName} metrics`}
        breadcrumbItems={[
          { label: 'Model serving', link: '/modelServing' },
          {
            label: `${modelDisplayName} metrics`,
            isActive: true,
          },
        ]}
      />
    </ModelServingMetricsProvider>
  );
};

export default ModelServingMetricsWrapper;

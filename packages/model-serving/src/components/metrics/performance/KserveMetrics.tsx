import * as React from 'react';
import { ModelServingMetricsContext } from '../ModelServingMetricsContext';
import { KserveMetricsContextProvider } from '@odh-dashboard/internal/concepts/metrics/kserve/KserveMetricsContext';
import KserveMetricsContent from '@odh-dashboard/internal/concepts/metrics/kserve/content/KserveMetricsContent';

type KserveMetricsProps = {
  modelName: string;
};

const KserveMetrics: React.FC<KserveMetricsProps> = ({ modelName }) => {
  const { namespace } = React.useContext(ModelServingMetricsContext);

  return (
    <KserveMetricsContextProvider namespace={namespace} modelName={modelName}>
      <KserveMetricsContent />
    </KserveMetricsContextProvider>
  );
};

export default KserveMetrics;

import * as React from 'react';
import { ModelServingMetricsContext } from '../ModelServingMetricsContext';
import { NimMetricsContextProvider } from '@odh-dashboard/internal/concepts/metrics/kserve/NimMetricsContext';
import NimMetricsContent from '@odh-dashboard/internal/concepts/metrics/kserve/content/NimMetricsContent';

type NimMetricsProps = {
  modelName: string;
};

const NimMetrics: React.FC<NimMetricsProps> = ({ modelName }) => {
  const { namespace } = React.useContext(ModelServingMetricsContext);

  return (
    <NimMetricsContextProvider namespace={namespace} modelName={modelName}>
      <NimMetricsContent />
    </NimMetricsContextProvider>
  );
};

export default NimMetrics;

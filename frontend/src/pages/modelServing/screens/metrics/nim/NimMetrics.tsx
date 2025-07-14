import * as React from 'react';
import { ModelServingMetricsContext } from '#~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { NimMetricsContextProvider } from '#~/concepts/metrics/kserve/NimMetricsContext';
import NimMetricsContent from '#~/concepts/metrics/kserve/content/NimMetricsContent';

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

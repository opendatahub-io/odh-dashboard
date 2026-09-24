import * as React from 'react';
import { NimMetricsContextProvider } from '../kserve/NimMetricsContext';
import NimMetricsContent from '../kserve/content/NimMetricsContent';
import { ModelServingMetricsContext } from '../ModelServingMetricsContext';

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

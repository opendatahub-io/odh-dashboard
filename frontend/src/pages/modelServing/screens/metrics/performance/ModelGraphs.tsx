import * as React from 'react';
import { InferenceServiceKind } from '#~/k8sTypes';
import KserveMetrics from '#~/pages/modelServing/screens/metrics/performance/KserveMetrics';

type ModelGraphProps = {
  model: InferenceServiceKind;
};

// Always KServe (no ModelMesh)
const ModelGraphs: React.FC<ModelGraphProps> = ({ model }) => (
  <KserveMetrics modelName={model.metadata.name} />
);

export default ModelGraphs;

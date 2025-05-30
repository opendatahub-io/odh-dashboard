import * as React from 'react';
import { InferenceServiceKind } from '#~/k8sTypes';
import { isModelMesh } from '#~/pages/modelServing/utils';
import ModelMeshMetrics from '#~/pages/modelServing/screens/metrics/performance/ModelMeshMetrics';
import KserveMetrics from '#~/pages/modelServing/screens/metrics/performance/KserveMetrics';

type ModelGraphProps = {
  model: InferenceServiceKind;
};

const ModelGraphs: React.FC<ModelGraphProps> = ({ model }) =>
  isModelMesh(model) ? <ModelMeshMetrics /> : <KserveMetrics modelName={model.metadata.name} />;

export default ModelGraphs;

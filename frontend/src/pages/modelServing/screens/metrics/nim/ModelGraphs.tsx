import * as React from 'react';
import { InferenceServiceKind } from '~/k8sTypes';
import { isModelMesh } from '~/pages/modelServing/utils';
import ModelMeshMetrics from '~/pages/modelServing/screens/metrics/performance/ModelMeshMetrics';
import NimMetrics from '~/pages/modelServing/screens/metrics/nim/NimMetrics';

type ModelGraphProps = {
  model: InferenceServiceKind;
};

const ModelGraphs: React.FC<ModelGraphProps> = ({ model }) =>
  isModelMesh(model) ? <ModelMeshMetrics /> : <NimMetrics modelName={model.metadata.name} />;

export default ModelGraphs;

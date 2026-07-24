import * as React from 'react';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import KserveMetrics from './KserveMetrics';

type ModelGraphProps = {
  model: InferenceServiceKind;
};

// Always KServe
const ModelGraphs: React.FC<ModelGraphProps> = ({ model }) => (
  <KserveMetrics modelName={model.metadata.name} />
);

export default ModelGraphs;

import { InferenceServiceKind, ServingRuntimeKind, FetchStateObject } from 'mod-arch-shared';

export type ModelVersionRegisteredDeploymentsViewProps = {
  inferenceServices: FetchStateObject<InferenceServiceKind[]>;
  servingRuntimes: FetchStateObject<ServingRuntimeKind[]>;
  refresh: () => void;
};

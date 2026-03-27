import type { MaaSModelRef } from '@odh-dashboard/maas/types/maas-model';

export const mockMaaSModelRef = ({
  name = 'test-maas-model-ref',
  namespace = 'test-project',
  modelRef = {
    name: 'test-llm-inference-service',
    kind: 'LLMInferenceService',
  },
  displayName = 'Test LLM Inference Service',
  description = 'Test LLM Inference Service Description',
}: Partial<MaaSModelRef> = {}): MaaSModelRef => ({
  name,
  namespace,
  modelRef,
  displayName,
  description,
});

import { MaaSModelRefSummary } from '~/app/types/subscriptions';

export const DEFAULT_MODEL_KIND = 'LLMInferenceService' as const;

/**
 * Resolves bare model refs (name + namespace) into full MaaSModelRefSummary objects
 * using the live catalog, falling back to a synthetic entry for deleted models.
 */
export const modelRefsToSummaries = (
  refs: { name: string; namespace: string }[],
  catalog: MaaSModelRefSummary[],
): MaaSModelRefSummary[] =>
  refs.map((ref) => {
    const matchedModelRef = catalog.find(
      (c) => c.name === ref.name && c.namespace === ref.namespace,
    );
    if (matchedModelRef) {
      return matchedModelRef;
    }
    return {
      name: ref.name,
      namespace: ref.namespace,
      modelRef: { kind: DEFAULT_MODEL_KIND, name: ref.name },
    };
  });

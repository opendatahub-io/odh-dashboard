import { isCollectionCategory, type CollectionCategory } from '~/app/pages/const';

/**
 * Temporary bridge between the curated collection taxonomy and the provider-owned benchmark
 * taxonomy. Benchmark categories are supplied by providers, so this mapping intentionally uses
 * their current display values instead of introducing a second benchmark-category enum.
 *
 * Keep this map inclusive while the benchmark suggestion system is being designed. A benchmark
 * category may support more than one collection category, and selected collection categories are
 * combined with OR semantics when deriving the benchmark filters.
 */
export const BENCHMARK_CATEGORY_TO_COLLECTION_CATEGORIES: Readonly<
  Record<string, readonly CollectionCategory[]>
> = {
  Agent: ['tool_use_and_function_calling'],
  Aggregation: ['grounded_document_understanding', 'tool_use_and_function_calling'],
  Alignment: ['instruction_and_output_reliability', 'trustworthiness'],
  Code: ['software'],
  Coding: ['software'],
  Custom: ['tool_use_and_function_calling'],
  Cybersecurity: ['software', 'trustworthiness'],
  General: ['instruction_and_output_reliability', 'tool_use_and_function_calling'],
  'Instruction following': ['instruction_and_output_reliability', 'tool_use_and_function_calling'],
  Knowledge: ['grounded_document_understanding', 'knowledge_and_reasoning'],
  'Language modeling': ['knowledge_and_reasoning', 'multilingual'],
  'Language understanding': [
    'grounded_document_understanding',
    'knowledge_and_reasoning',
    'multilingual',
  ],
  'Logic reasoning': ['knowledge_and_reasoning'],
  'Long context': ['grounded_document_understanding', 'knowledge_and_reasoning'],
  Math: ['instruction_and_output_reliability', 'knowledge_and_reasoning'],
  Medical: ['knowledge_and_reasoning'],
  Multilingual: ['multilingual'],
  Multimodal: ['grounded_document_understanding', 'multimodal'],
  'Needle in a haystack': ['grounded_document_understanding', 'knowledge_and_reasoning'],
  Performance: ['software'],
  'Question answering': [
    'grounded_document_understanding',
    'knowledge_and_reasoning',
    'multimodal',
  ],
  'Reading comprehension': [
    'grounded_document_understanding',
    'knowledge_and_reasoning',
    'multimodal',
  ],
  Reasoning: ['instruction_and_output_reliability', 'knowledge_and_reasoning'],
  Safety: ['trustworthiness'],
  Science: ['knowledge_and_reasoning'],
  Security: ['software', 'trustworthiness'],
  'Structured output': ['instruction_and_output_reliability'],
  'Variable tracking': ['grounded_document_understanding', 'tool_use_and_function_calling'],
};

/**
 * Returns benchmark category filters for the selected collection categories.
 *
 * Unknown collection categories and benchmark categories that have not been added to the
 * interim map are ignored. The result is sorted to keep filter state deterministic.
 */
export const getBenchmarkCategoryFilters = (collectionCategories: readonly string[]): string[] => {
  const selectedCollectionCategories = new Set(collectionCategories.filter(isCollectionCategory));

  return Object.entries(BENCHMARK_CATEGORY_TO_COLLECTION_CATEGORIES)
    .filter(([, mappedCollectionCategories]) =>
      mappedCollectionCategories.some((category) => selectedCollectionCategories.has(category)),
    )
    .map(([benchmarkCategory]) => benchmarkCategory)
    .toSorted((left, right) => left.localeCompare(right));
};

const normalizeBenchmarkCategory = (category: string): string =>
  category.trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').toLocaleLowerCase();

/**
 * Resolves mapped filters to the exact values supplied by benchmark providers.
 * Provider values are used for filtering, while their display labels are formatted separately.
 */
export const getBenchmarkCategoryFiltersForAvailableCategories = (
  collectionCategories: readonly string[],
  availableCategories: readonly string[],
): string[] => {
  const availableCategoriesByNormalizedValue = new Map(
    availableCategories.map((category) => [normalizeBenchmarkCategory(category), category]),
  );

  return getBenchmarkCategoryFilters(collectionCategories)
    .map((category) =>
      availableCategoriesByNormalizedValue.get(normalizeBenchmarkCategory(category)),
    )
    .filter((category): category is string => category !== undefined);
};

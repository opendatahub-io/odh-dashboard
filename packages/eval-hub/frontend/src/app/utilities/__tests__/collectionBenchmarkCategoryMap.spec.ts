import {
  BENCHMARK_CATEGORY_TO_COLLECTION_CATEGORIES,
  getBenchmarkCategoryFilters,
  getBenchmarkCategoryFiltersForAvailableCategories,
} from '~/app/utilities/collectionBenchmarkCategoryMap';

describe('getBenchmarkCategoryFilters', () => {
  it('should return the mapped benchmark categories for one collection category', () => {
    expect(getBenchmarkCategoryFilters(['software'])).toEqual(
      ['Code', 'Coding', 'Cybersecurity', 'Performance', 'Security'].toSorted((left, right) =>
        left.localeCompare(right),
      ),
    );
  });

  it('should combine and deduplicate filters for multiple collection categories', () => {
    const filters = getBenchmarkCategoryFilters(['software', 'trustworthiness']);

    expect(filters).toEqual([...new Set(filters)]);
    expect(filters).toEqual(
      expect.arrayContaining(['Alignment', 'Code', 'Cybersecurity', 'Safety', 'Security']),
    );
  });

  it('should include relationships observed in system-owned curated collections', () => {
    expect(getBenchmarkCategoryFilters(['grounded_document_understanding'])).toEqual(
      expect.arrayContaining(['Aggregation', 'Question answering', 'Variable tracking']),
    );
    expect(getBenchmarkCategoryFilters(['instruction_and_output_reliability'])).toEqual(
      expect.arrayContaining(['Math', 'Reasoning']),
    );
  });

  it('should ignore unsupported collection categories', () => {
    expect(getBenchmarkCategoryFilters(['not-a-collection-category'])).toEqual([]);
  });

  it('should resolve mapped filters to provider values regardless of case or separators', () => {
    expect(
      getBenchmarkCategoryFiltersForAvailableCategories(
        ['software', 'knowledge_and_reasoning'],
        ['code', 'language_modeling', 'reasoning', 'security'],
      ),
    ).toEqual(['code', 'language_modeling', 'reasoning', 'security']);
  });

  it('should include all provider values sharing a normalized form', () => {
    expect(
      getBenchmarkCategoryFiltersForAvailableCategories(['software'], ['Code', 'code', 'coding']),
    ).toEqual(['Code', 'code', 'coding']);
  });

  it('should keep each mapped collection category within the supported taxonomy', () => {
    const supportedCategories = new Set([
      'grounded_document_understanding',
      'instruction_and_output_reliability',
      'knowledge_and_reasoning',
      'multilingual',
      'multimodal',
      'software',
      'tool_use_and_function_calling',
      'trustworthiness',
    ]);

    expect(
      Object.values(BENCHMARK_CATEGORY_TO_COLLECTION_CATEGORIES)
        .flat()
        .every((category) => supportedCategories.has(category)),
    ).toBe(true);
  });
});

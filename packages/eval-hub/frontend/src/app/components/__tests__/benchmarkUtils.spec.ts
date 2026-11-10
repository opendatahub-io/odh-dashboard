import {
  toTitleCase,
  capitalizeFirst,
  getCategoryColor,
  getCategoryTileColor,
  CATEGORY_TILE_COLORS,
  formatCategory,
  getCollectionCategoryValues,
  formatCollectionMetadataValue,
  getMetricDisplayName,
  toSafeExternalUrl,
  getBenchmarkDisplayName,
  getBenchmarkNameMap,
  getVisibleMetricCount,
} from '~/app/components/benchmarkUtils';

describe('toTitleCase', () => {
  it('should return empty string unchanged', () => {
    expect(toTitleCase('')).toBe('');
  });

  it('should capitalize the first letter of each word', () => {
    expect(toTitleCase('hello world')).toBe('Hello World');
    expect(toTitleCase('prompt injection')).toBe('Prompt Injection');
  });

  it('should preserve all-caps words (acronyms)', () => {
    expect(toTitleCase('NLP safety')).toBe('NLP Safety');
    expect(toTitleCase('DAN attack')).toBe('DAN Attack');
    expect(toTitleCase('BBQ benchmark')).toBe('BBQ Benchmark');
  });

  it('should handle single-word input', () => {
    expect(toTitleCase('hello')).toBe('Hello');
    expect(toTitleCase('NLP')).toBe('NLP');
  });

  it('should handle mixed case input', () => {
    expect(toTitleCase('mcdonald analysis')).toBe('Mcdonald Analysis');
    expect(toTitleCase('HELLO WORLD')).toBe('HELLO WORLD');
  });

  it('should handle single character words', () => {
    expect(toTitleCase('a b c')).toBe('A B C');
  });

  it('should handle already title-cased input', () => {
    expect(toTitleCase('Already Title Case')).toBe('Already Title Case');
  });

  it('should return falsy values unchanged', () => {
    // @ts-expect-error testing runtime guard with non-string input
    expect(toTitleCase(undefined)).toBeUndefined();
    // @ts-expect-error testing runtime guard with non-string input
    expect(toTitleCase(null)).toBeNull();
  });
});

describe('capitalizeFirst', () => {
  it('should capitalize the first character only', () => {
    expect(capitalizeFirst('hello')).toBe('Hello');
    expect(capitalizeFirst('hello world')).toBe('Hello world');
  });

  it('should not change already capitalized strings', () => {
    expect(capitalizeFirst('Hello')).toBe('Hello');
  });
});

describe('getCategoryColor', () => {
  it('should return blue for undefined category', () => {
    expect(getCategoryColor(undefined)).toBe('blue');
  });

  it('should return blue for empty string', () => {
    expect(getCategoryColor('')).toBe('blue');
  });

  it('should return a consistent color for the same category', () => {
    const color = getCategoryColor('unknown-category');
    expect(getCategoryColor('unknown-category')).toBe(color);
  });

  it('should be case-insensitive', () => {
    expect(getCategoryColor('Unknown-Category')).toBe(getCategoryColor('unknown-category'));
  });

  it('should not resolve Object.prototype members', () => {
    const palette = ['blue', 'teal', 'green', 'purple', 'orange', 'red', 'yellow'];
    expect(palette).toContain(getCategoryColor('constructor'));
    expect(palette).toContain(getCategoryColor('__proto__'));
    expect(palette).toContain(getCategoryColor('toString'));
  });

  it.each([
    ['knowledge_and_reasoning', 'purple'],
    ['grounded_document_understanding', 'blue'],
    ['instruction_and_output_reliability', 'green'],
    ['tool_use_and_function_calling', 'orange'],
    ['software', 'teal'],
    ['trustworthiness', 'red'],
    ['multilingual', 'grey'],
    ['multimodal', 'yellow'],
  ])('maps %s to the matching PatternFly label family', (category, color) => {
    expect(getCategoryColor(category)).toBe(color);
  });
});

describe('getCategoryTileColor', () => {
  it.each([
    ['knowledge_and_reasoning', 'lavender', '#D0C4F3'],
    ['grounded_document_understanding', 'light-blue', '#B9DCF7'],
    ['instruction_and_output_reliability', 'light-green', '#C8EFB5'],
    ['tool_use_and_function_calling', 'apricot', '#FFD0A0'],
    ['software', 'mint-teal', '#BCE8DF'],
    ['trustworthiness', 'soft-pink', '#F5C1C1'],
    ['multilingual', 'pale-cyan', '#B9E5E5'],
    ['multimodal', 'soft-mint-yellow', '#E6E6A8'],
  ])('maps %s to the %s tile colour', (category, color, hex) => {
    expect(getCategoryTileColor(category)).toBe(color);
    expect(CATEGORY_TILE_COLORS[getCategoryTileColor(category)]).toBe(hex);
  });

  it('assigns a unique swatch to every supported EvalHub category', () => {
    const categoryColors = [
      'knowledge_and_reasoning',
      'grounded_document_understanding',
      'instruction_and_output_reliability',
      'tool_use_and_function_calling',
      'software',
      'trustworthiness',
      'multilingual',
      'multimodal',
    ].map((category) => getCategoryTileColor(category));

    expect(new Set(categoryColors).size).toBe(categoryColors.length);
  });

  it('uses the light-blue swatch for an unknown category', () => {
    expect(getCategoryTileColor(undefined)).toBe('light-blue');
  });

  it('should not resolve Object.prototype members', () => {
    expect(getCategoryTileColor('constructor')).toBe('light-blue');
    expect(getCategoryTileColor('__proto__')).toBe('light-blue');
    expect(getCategoryTileColor('toString')).toBe('light-blue');
  });
});

describe('formatCategory', () => {
  it('should replace underscores with spaces and capitalize first letter', () => {
    expect(formatCategory('exact_match')).toBe('Exact match');
  });

  it('should capitalize a single word', () => {
    expect(formatCategory('accuracy')).toBe('Accuracy');
  });

  it('should handle multiple underscores', () => {
    expect(formatCategory('inst_level_loose_acc')).toBe('Inst level loose acc');
  });
});

describe('getCollectionCategoryValues', () => {
  it('should prefer category when domains are also present', () => {
    expect(
      getCollectionCategoryValues({
        category: 'primary_category',
        domains: ['domain_fallback'],
      }),
    ).toEqual(['primary_category']);
  });

  it('should fall back to domains when category is unavailable', () => {
    expect(getCollectionCategoryValues({ domains: ['domain_fallback'] })).toEqual([
      'domain_fallback',
    ]);
  });
});

describe('formatCollectionMetadataValue', () => {
  it('should render snake case metadata as a human-readable label', () => {
    expect(formatCollectionMetadataValue('knowledge_and_reasoning')).toBe(
      'Knowledge and reasoning',
    );
    expect(formatCollectionMetadataValue('document_chart_vqa')).toBe('Document chart VQA');
    expect(formatCollectionMetadataValue('text-generation')).toBe('Text generation');
  });

  it('should preserve supported metadata acronyms when formatting labels', () => {
    expect(formatCollectionMetadataValue('qa-rag-vqa')).toBe('QA RAG VQA');
  });

  it('should leave the value unchanged for payload use', () => {
    const value = 'grounded_document_understanding';
    expect(value).toBe('grounded_document_understanding');
    expect(formatCollectionMetadataValue(value)).toBe('Grounded document understanding');
  });
});

describe('getMetricDisplayName', () => {
  it('should return the mapped display name for known metrics', () => {
    expect(getMetricDisplayName('acc')).toBe('Accuracy');
    expect(getMetricDisplayName('accuracy/accuracy')).toBe('Accuracy');
    expect(getMetricDisplayName('exact_match')).toBe('Exact match');
    expect(getMetricDisplayName('pass@1')).toBe('Pass@1');
    expect(getMetricDisplayName('ppl')).toBe('Perplexity');
    expect(getMetricDisplayName('telelogs_scorer/maj_at_k')).toBe('Telelogs majority at k');
    expect(getMetricDisplayName('bleu')).toBe('BLEU');
  });

  it('should fall back to formatCategory for unknown metrics', () => {
    expect(getMetricDisplayName('custom_metric')).toBe('Custom metric');
    expect(getMetricDisplayName('f1')).toBe('F1');
  });

  it('should not resolve Object.prototype members', () => {
    expect(getMetricDisplayName('constructor')).toBe('Constructor');
    expect(getMetricDisplayName('toString')).toBe('ToString');
    expect(getMetricDisplayName('valueOf')).toBe('ValueOf');
    expect(typeof getMetricDisplayName('__proto__')).toBe('string');
  });
});

describe('getVisibleMetricCount', () => {
  it('should keep the overflow label within the available width', () => {
    expect(getVisibleMetricCount([165, 175, 109], [48, 48, 48], 308, 4)).toBe(1);
  });

  it('should show all metrics when they fit without an overflow label', () => {
    expect(getVisibleMetricCount([65, 80, 110], [48, 48, 48], 300, 4)).toBe(3);
  });

  it('should preserve the maximum visible metric count', () => {
    expect(getVisibleMetricCount([40, 40, 40, 40], [48, 48, 48, 48], 300, 4)).toBe(3);
  });
});

describe('toSafeExternalUrl', () => {
  it('should return undefined for undefined input', () => {
    expect(toSafeExternalUrl(undefined)).toBeUndefined();
  });

  it('should return undefined for empty string', () => {
    expect(toSafeExternalUrl('')).toBeUndefined();
  });

  it('should return the URL for https protocol', () => {
    expect(toSafeExternalUrl('https://example.com')).toBe('https://example.com');
  });

  it('should return the URL for http protocol', () => {
    expect(toSafeExternalUrl('http://example.com')).toBe('http://example.com');
  });

  it('should return undefined for non-http protocols', () => {
    expect(toSafeExternalUrl('javascript:alert(1)')).toBeUndefined();
    expect(toSafeExternalUrl('ftp://example.com')).toBeUndefined();
  });

  it('should return undefined for invalid URLs', () => {
    expect(toSafeExternalUrl('not-a-url')).toBeUndefined();
  });
});

/* eslint-disable camelcase */
describe('benchmark name lookups', () => {
  it('should resolve provider-qualified and unique benchmark names', () => {
    const benchmarkNameMap = getBenchmarkNameMap([
      {
        resource: { id: 'provider-one' },
        name: 'Provider One',
        benchmarks: [{ id: 'benchmark-one', name: 'Benchmark One' }],
      },
      {
        resource: { id: 'provider-two' },
        name: 'Provider Two',
        benchmarks: [{ id: 'benchmark-two', name: 'Benchmark Two' }],
      },
    ]);

    expect(
      getBenchmarkDisplayName(
        { id: 'benchmark-one', provider_id: 'provider-one' },
        benchmarkNameMap,
      ),
    ).toBe('Benchmark One');
    expect(getBenchmarkDisplayName({ id: 'benchmark-two' }, benchmarkNameMap)).toBe(
      'Benchmark Two',
    );
    expect(getBenchmarkDisplayName({ id: 'unknown' }, benchmarkNameMap)).toBe('unknown');
  });

  it('should use the ID when a provider-agnostic benchmark name is ambiguous', () => {
    const benchmarkNameMap = getBenchmarkNameMap([
      {
        resource: { id: 'provider-one' },
        name: 'Provider One',
        benchmarks: [{ id: 'shared', name: 'Shared One' }],
      },
      {
        resource: { id: 'provider-two' },
        name: 'Provider Two',
        benchmarks: [{ id: 'shared', name: 'Shared Two' }],
      },
    ]);

    expect(getBenchmarkDisplayName({ id: 'shared' }, benchmarkNameMap)).toBe('shared');
    expect(
      getBenchmarkDisplayName({ id: 'shared', provider_id: 'provider-two' }, benchmarkNameMap),
    ).toBe('Shared Two');
  });
});
/* eslint-enable camelcase */

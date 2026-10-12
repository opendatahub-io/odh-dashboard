import {
  formatRuntimePublishedDate,
  formatRuntimeTemplate,
} from '~/odh/pages/runtimeCatalog/runtimeCatalogDetailsUtils';

describe('formatRuntimeTemplate', () => {
  it('should convert JSON with nested fields to YAML', () => {
    const template = '{"kind":"ServingRuntime","metadata":{"name":"example"}}';

    expect(formatRuntimeTemplate(template)).toBe(
      'kind: ServingRuntime\nmetadata:\n  name: example\n',
    );
  });

  it('should preserve a raw YAML template', () => {
    const template = 'kind: ServingRuntime\nmetadata:\n  name: raw-runtime\n';

    expect(formatRuntimeTemplate(template)).toBe(template);
  });

  it('should return N/A when the template is absent', () => {
    expect(formatRuntimeTemplate(undefined)).toBe('N/A');
    expect(formatRuntimeTemplate('')).toBe('N/A');
  });
});

describe('formatRuntimePublishedDate', () => {
  it('should format a UTC timestamp as a long date', () => {
    expect(formatRuntimePublishedDate('2026-10-01T00:00:00Z')).toBe('October 1, 2026');
  });

  it('should normalize an offset timestamp to the UTC date', () => {
    expect(formatRuntimePublishedDate('2026-09-30T23:30:00-02:00')).toBe('October 1, 2026');
  });

  it('should return undefined for an absent date', () => {
    expect(formatRuntimePublishedDate()).toBeUndefined();
    expect(formatRuntimePublishedDate('')).toBeUndefined();
  });

  it('should return undefined for an invalid date', () => {
    expect(formatRuntimePublishedDate('not-a-date')).toBeUndefined();
  });
});

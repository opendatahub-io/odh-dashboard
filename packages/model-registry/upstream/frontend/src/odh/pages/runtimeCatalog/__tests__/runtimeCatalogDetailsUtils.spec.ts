import {
  formatRuntimePublishedDate,
  formatRuntimeTemplate,
} from '~/odh/pages/runtimeCatalog/runtimeCatalogDetailsUtils';

describe('formatRuntimeTemplate', () => {
  it('should convert JSON with nested fields to YAML', () => {
    const template = '{"kind":"ServingRuntime","metadata":{"name":"example"}}';

    expect(formatRuntimeTemplate(template, false)).toBe(
      'kind: ServingRuntime\nmetadata:\n  name: example\n',
    );
  });

  it('should preserve a raw YAML template', () => {
    const template = 'kind: ServingRuntime\nmetadata:\n  name: raw-runtime\n';

    expect(formatRuntimeTemplate(template, false)).toBe(template);
  });

  it('should return N/A when the template is absent', () => {
    expect(formatRuntimeTemplate(undefined, false)).toBe('N/A');
    expect(formatRuntimeTemplate('', true)).toBe('N/A');
  });

  it('should prefix sample templates with a deployment warning', () => {
    expect(formatRuntimeTemplate('{"kind":"ServingRuntime"}', true)).toBe(
      '# Example only. Not deployable.\nkind: ServingRuntime\n',
    );
    expect(formatRuntimeTemplate('kind: ServingRuntime\n', true)).toBe(
      '# Example only. Not deployable.\nkind: ServingRuntime\n',
    );
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

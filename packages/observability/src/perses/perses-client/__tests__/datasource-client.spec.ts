import { buildDatasourceQueryParameters } from '../datasource-client';

describe('buildDatasourceQueryParameters', () => {
  it('should return empty URLSearchParams when no arguments are provided', () => {
    const result = buildDatasourceQueryParameters();

    expect(result.toString()).toBe('');
  });

  it('should include kind parameter when provided', () => {
    const result = buildDatasourceQueryParameters('PrometheusDatasource');

    expect(result.get('kind')).toBe('PrometheusDatasource');
    expect(result.has('default')).toBe(false);
    expect(result.has('name')).toBe(false);
  });

  it('should include default parameter when provided as true', () => {
    const result = buildDatasourceQueryParameters(undefined, true);

    expect(result.get('default')).toBe('true');
    expect(result.has('kind')).toBe(false);
    expect(result.has('name')).toBe(false);
  });

  it('should include default parameter when provided as false', () => {
    const result = buildDatasourceQueryParameters(undefined, false);

    expect(result.get('default')).toBe('false');
  });

  it('should include name parameter when provided', () => {
    const result = buildDatasourceQueryParameters(undefined, undefined, 'my-datasource');

    expect(result.get('name')).toBe('my-datasource');
    expect(result.has('kind')).toBe(false);
    expect(result.has('default')).toBe(false);
  });

  it('should include all parameters when all are provided', () => {
    const result = buildDatasourceQueryParameters('PrometheusDatasource', true, 'thanos-querier');

    expect(result.get('kind')).toBe('PrometheusDatasource');
    expect(result.get('default')).toBe('true');
    expect(result.get('name')).toBe('thanos-querier');
  });

  it('should not include parameters with undefined values', () => {
    const result = buildDatasourceQueryParameters('PrometheusDatasource', undefined, undefined);

    const keys = Array.from(result.keys());
    expect(keys).toEqual(['kind']);
  });
});

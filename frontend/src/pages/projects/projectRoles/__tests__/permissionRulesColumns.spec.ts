import { formatRuleValues } from '#~/pages/projects/projectRoles/permissionRulesColumns';

describe('formatRuleValues', () => {
  it('should return "-" for undefined values', () => {
    expect(formatRuleValues(undefined)).toBe('-');
  });

  it('should return "-" for empty array', () => {
    expect(formatRuleValues([])).toBe('-');
  });

  it('should display "core" for empty string (core API group)', () => {
    expect(formatRuleValues([''])).toBe('core');
  });

  it('should display "core" alongside other values', () => {
    expect(formatRuleValues(['', 'apps'])).toBe('core, apps');
  });

  it('should return "All" when wildcard is present', () => {
    expect(formatRuleValues(['*'])).toBe('All');
  });

  it('should return "All" when wildcard is among other values', () => {
    expect(formatRuleValues(['get', '*', 'list'])).toBe('All');
  });

  it('should join multiple values with comma', () => {
    expect(formatRuleValues(['get', 'list', 'watch'])).toBe('get, list, watch');
  });

  it('should return single value without comma', () => {
    expect(formatRuleValues(['pods'])).toBe('pods');
  });

  it('should trim whitespace from values', () => {
    expect(formatRuleValues([' get ', ' list '])).toBe('get, list');
  });
});

import { FEAST_PROJECT_NAME_REGEX } from '../types';

describe('FEAST_PROJECT_NAME_REGEX', () => {
  describe('valid names (RFC 1123 subdomain)', () => {
    const validNames = [
      'myfeaturestore',
      'a',
      '1',
      'a1',
      '1a',
      'my-store',
      'my.store',
      'test123',
      'a-b-c',
      'a.b.c',
      'feature-store-v2',
      '0123456789',
      'a-1.b-2',
    ];

    it.each(validNames)('should match "%s"', (name) => {
      expect(FEAST_PROJECT_NAME_REGEX.test(name)).toBe(true);
    });
  });

  describe('invalid names', () => {
    const invalidNames = [
      { name: 'my_store', reason: 'contains underscore' },
      { name: 'MyStore', reason: 'contains uppercase' },
      { name: 'My-Store', reason: 'contains uppercase' },
      { name: '-store', reason: 'starts with hyphen' },
      { name: 'store-', reason: 'ends with hyphen' },
      { name: '.store', reason: 'starts with dot' },
      { name: 'store.', reason: 'ends with dot' },
      { name: '', reason: 'empty string' },
      { name: 'my store', reason: 'contains space' },
      { name: 'my@store', reason: 'contains special character' },
      { name: 'my/store', reason: 'contains slash' },
      { name: 'my_feature_store', reason: 'contains underscores (Feast SQLite incompatible)' },
    ];

    it.each(invalidNames)('should not match "$name" ($reason)', ({ name }) => {
      expect(FEAST_PROJECT_NAME_REGEX.test(name)).toBe(false);
    });
  });
});

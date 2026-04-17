import { INVALID_DATABASE_CHARS } from '#~/pages/modelRegistrySettings/const';

describe('INVALID_DATABASE_CHARS', () => {
  it('should match database names containing ?', () => {
    expect(INVALID_DATABASE_CHARS.test('mydb?tls=preferred')).toBe(true);
    expect(INVALID_DATABASE_CHARS.test('DB_NAME?charset')).toBe(true);
  });

  it('should not match valid database names', () => {
    expect(INVALID_DATABASE_CHARS.test('my_valid_db')).toBe(false);
    expect(INVALID_DATABASE_CHARS.test('model-registry')).toBe(false);
    expect(INVALID_DATABASE_CHARS.test('testdb123')).toBe(false);
  });

  it('should not match empty strings', () => {
    expect(INVALID_DATABASE_CHARS.test('')).toBe(false);
  });
});

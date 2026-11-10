/**
 * @jest-environment node
 */
import { loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('Contract matcher nullable references', () => {
  const apiSchema = loadOpenAPISchema('contract-tests/fixtures/nullable-status.yaml', 'components');

  it('should apply OpenAPI nullable semantics to enum constraints', () => {
    expect('ready').toMatchContract(apiSchema, {
      ref: '#/components/schemas/NullableEnumIncludingNull',
    });
    expect(null).toMatchContract(apiSchema, {
      ref: '#/components/schemas/NullableEnumIncludingNull',
    });
    expect(null).not.toMatchContract(apiSchema, {
      ref: '#/components/schemas/NullableEnumExcludingNull',
    });
    expect('invalid').not.toMatchContract(apiSchema, {
      ref: '#/components/schemas/NullableEnumIncludingNull',
    });
  });

  it('should reject missing schema references for positive and negated assertions', () => {
    const options = { ref: '#/components/schemas/Missing' };

    expect(() => expect('ready').toMatchContract(apiSchema, options)).toThrow(
      'Schema reference #/components/schemas/Missing was not found',
    );
    expect(() => expect('ready').not.toMatchContract(apiSchema, options)).toThrow(
      'Schema reference #/components/schemas/Missing was not found',
    );
  });
});

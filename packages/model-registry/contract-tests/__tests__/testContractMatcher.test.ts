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
});

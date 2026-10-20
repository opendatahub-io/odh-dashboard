/**
 * @jest-environment node
 */
import '@odh-dashboard/contract-tests';

describe('Contract matcher nullable references', () => {
  const apiSchema = {
    components: {
      schemas: {
        Status: {
          type: 'string',
          enum: ['ready'],
        },
        NullableStatus: {
          $ref: '#/components/schemas/Status',
          nullable: true,
        },
      },
    },
  };

  it('should preserve referenced constraints while allowing null', () => {
    expect('ready').toMatchContract(apiSchema, {
      ref: '#/components/schemas/NullableStatus',
    });
    expect(null).toMatchContract(apiSchema, {
      ref: '#/components/schemas/NullableStatus',
    });
    expect('invalid').not.toMatchContract(apiSchema, {
      ref: '#/components/schemas/NullableStatus',
    });
  });
});

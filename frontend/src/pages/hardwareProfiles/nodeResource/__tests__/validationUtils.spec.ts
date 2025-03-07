import { resourceLabelIdentifierSchema } from '~/pages/hardwareProfiles/nodeResource/validationUtils';

describe('resourceLabelIdentifierSchema', () => {
  it('should not validate if fields are empty', () => {
    const fields = {
      resourceLabel: '',
      resourceIdentifier: '',
    };
    const result = resourceLabelIdentifierSchema.safeParse(fields);
    expect(result.error?.errors).toEqual([
      {
        code: 'too_small',
        inclusive: true,
        message: 'The resource label cannot be empty',
        minimum: 1,
        path: ['resourceLabel'],
        type: 'string',
      },
      {
        code: 'too_small',
        inclusive: true,
        message: 'The resource identifier cannot be empty',
        minimum: 1,
        path: ['resourceIdentifier'],
        type: 'string',
      },
    ]);
  });

  it('should not validate if fields are over 500 characters', () => {
    const fields = {
      resourceLabel:
        'this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this i',
      resourceIdentifier:
        'this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this is a test this i',
    };
    const result = resourceLabelIdentifierSchema.safeParse(fields);
    expect(result.error?.errors).toEqual([
      {
        code: 'too_big',
        inclusive: true,
        message: 'The resource label cannot have over 500 characters',
        maximum: 500,
        path: ['resourceLabel'],
        type: 'string',
      },
      {
        code: 'too_big',
        inclusive: true,
        message: 'The resource identifier cannot have over 500 characters',
        maximum: 500,
        path: ['resourceIdentifier'],
        type: 'string',
      },
    ]);
  });

  it('should not validate if fields are within the limits', () => {
    const fields = {
      resourceLabel: 'this is a test',
      resourceIdentifier: 'this is a test',
    };
    const result = resourceLabelIdentifierSchema.safeParse(fields);
    expect(result.error?.errors).toEqual(undefined);
  });
});

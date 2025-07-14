import { z } from 'zod';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { useValidation } from '#~/utilities/useValidation';

const objectSchema = z.object({
  foo: z.string().regex(/^foo-/, 'invalid foo'),
  bar: z.number().min(4, 'invalid bar').optional(),
});

const nonObjectSchema = z
  .object(objectSchema.shape)
  .refine((data) => data.foo.length !== data.bar, 'test error');

describe('useValidation', () => {
  it('should validate the data with object schema', () => {
    const renderResult = testHook(useValidation)({ foo: 'foo-test', bar: 100 }, objectSchema);
    expect(renderResult.result.current.validationResult.success).toBe(true);

    renderResult.rerender({ foo: 'foo', bar: 1 }, objectSchema);
    expect(renderResult.result.current.validationResult.success).toBe(false);
    expect(renderResult.result.current.validationResult.error?.errors).toHaveLength(2);
    expect(renderResult.result.current.validationResult.error?.errors[0]).toEqual(
      expect.objectContaining({
        code: 'invalid_string',
        path: ['foo'],
        message: 'invalid foo',
      }),
    );
    expect(renderResult.result.current.validationResult.error?.errors[1]).toEqual(
      expect.objectContaining({
        code: 'too_small',
        path: ['bar'],
        message: 'invalid bar',
      }),
    );

    expect(renderResult.result.current.hasValidationIssue(['foo'], 'invalid_string')).toBe(true);
    expect(renderResult.result.current.hasValidationIssue(['foo'], 'too_small')).toBe(false);
    expect(renderResult.result.current.hasValidationIssue(['bar'], 'invalid_string')).toBe(false);
    expect(renderResult.result.current.hasValidationIssue(['bar'], 'too_small')).toBe(true);
  });

  it('should validate the data with non-object schema', () => {
    const renderResult = testHook(useValidation)({ foo: 'foo-test', bar: 8 }, nonObjectSchema);
    expect(renderResult.result.current.validationResult.success).toBe(false);
    expect(renderResult.result.current.validationResult.error?.errors).toHaveLength(1);
    expect(renderResult.result.current.validationResult.error?.errors[0]).toEqual(
      expect.objectContaining({
        code: 'custom',
        path: [],
        message: 'test error',
      }),
    );
  });

  it('should be stable', () => {
    const renderResult = testHook(useValidation)({ foo: 'foo-test', bar: 100 }, objectSchema);
    renderResult.rerender({ foo: 'foo-test', bar: 100 }, objectSchema);
    expect(renderResult).hookToBeStable({ validationResult: true, getValidationIssue: true });
    renderResult.rerender({ foo: 'foo-test', bar: 101 }, objectSchema);
    expect(renderResult).hookToBeStable({ validationResult: false, getValidationIssue: true });
    expect(renderResult).hookToHaveUpdateCount(3);
  });
});

import { K8sStatusError } from '@odh-dashboard/k8s-core';
import { translateModelServingError } from '../errorUtils';

describe('translateModelServingError', () => {
  describe('409 AlreadyExists errors', () => {
    it.each([
      {
        kind: 'inferenceservices',
        name: 'my-deployment',
        expectedType: 'model deployment',
      },
      {
        kind: 'servingruntimes',
        name: 'test-runtime',
        expectedType: 'serving runtime',
      },
      {
        kind: 'llminferenceservices',
        name: 'my-llm',
        expectedType: 'model deployment',
      },
    ])(
      'returns a friendly message for $kind 409 duplicate name errors',
      ({ kind, name, expectedType }) => {
        const error = new K8sStatusError({
          kind: 'Status',
          apiVersion: 'v1',
          status: 'Failure',
          message: `${kind}.serving.kserve.io "${name}" already exists`,
          reason: 'AlreadyExists',
          code: 409,
        });
        // @ts-expect-error K8s API returns details with name field not modeled in the type
        error.statusObject.details = { name, kind };
        expect(translateModelServingError(error)).toBe(
          `A ${expectedType} with the name "${name}" already exists. Please choose a different ${expectedType} name.`,
        );
      },
    );

    it('returns a generic resource message for 409 without details', () => {
      const error = new K8sStatusError({
        kind: 'Status',
        apiVersion: 'v1',
        status: 'Failure',
        message: 'resource already exists',
        reason: 'AlreadyExists',
        code: 409,
      });
      expect(translateModelServingError(error)).toBe(
        'A resource with this name already exists. Please choose a different resource name.',
      );
    });

    it('passes through 409 Conflict (optimistic locking) errors unchanged', () => {
      const error = new K8sStatusError({
        kind: 'Status',
        apiVersion: 'v1',
        status: 'Failure',
        message: 'the object has been modified; please apply your changes to the latest version',
        reason: 'Conflict',
        code: 409,
      });
      expect(translateModelServingError(error)).toBe(
        'the object has been modified; please apply your changes to the latest version',
      );
    });
  });

  describe('K8s resource group replacement in non-duplicate errors', () => {
    it.each([
      {
        input: 'servingruntimes.serving.kserve.io is forbidden: User cannot create',
        expected: 'serving runtime is forbidden: User cannot create',
      },
      {
        input: 'inferenceservices.serving.kserve.io is forbidden: User cannot update',
        expected: 'model deployment is forbidden: User cannot update',
      },
    ])('replaces resource group in "$input"', ({ input, expected }) => {
      expect(translateModelServingError(new Error(input))).toBe(expected);
    });
  });

  it('passes through unrelated error messages unchanged', () => {
    expect(translateModelServingError(new Error('Network error: connection refused'))).toBe(
      'Network error: connection refused',
    );
  });

  it('handles string errors as fallback', () => {
    expect(translateModelServingError('something went wrong')).toBe('something went wrong');
  });

  describe('displayName override', () => {
    it('uses displayName instead of k8s resource name in 409 errors', () => {
      const error = new K8sStatusError({
        kind: 'Status',
        apiVersion: 'v1',
        status: 'Failure',
        message: 'inferenceservices.serving.kserve.io "test-model" already exists',
        reason: 'AlreadyExists',
        code: 409,
      });
      // @ts-expect-error K8s API returns details with name field not modeled in the type
      error.statusObject.details = { name: 'test-model', kind: 'inferenceservices' };
      expect(translateModelServingError(error, 'test model')).toBe(
        'A model deployment with the name "test model" already exists. Please choose a different model deployment name.',
      );
    });

    it('falls back to k8s name when displayName is not provided', () => {
      const error = new K8sStatusError({
        kind: 'Status',
        apiVersion: 'v1',
        status: 'Failure',
        message: 'inferenceservices.serving.kserve.io "test-model" already exists',
        reason: 'AlreadyExists',
        code: 409,
      });
      // @ts-expect-error K8s API returns details with name field not modeled in the type
      error.statusObject.details = { name: 'test-model', kind: 'inferenceservices' };
      expect(translateModelServingError(error)).toBe(
        'A model deployment with the name "test-model" already exists. Please choose a different model deployment name.',
      );
    });
  });
});

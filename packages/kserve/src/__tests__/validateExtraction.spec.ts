import { mockInferenceServiceK8sResource } from '@odh-dashboard/internal/__mocks__/mockInferenceServiceK8sResource';
import { mockServingRuntimeK8sResource } from '@odh-dashboard/internal/__mocks__/mockServingRuntimeK8sResource';
import type { KServeDeployment } from '../deployments';
import { validateExtraction } from '../validateExtraction';

const createDeployment = (
  envVars?: NonNullable<KServeDeployment['model']['spec']['predictor']['model']>['env'],
): KServeDeployment => ({
  modelServingPlatformId: 'kserve',
  model: mockInferenceServiceK8sResource({ env: envVars }),
  server: mockServingRuntimeK8sResource({}),
});

describe('validateExtraction', () => {
  it('should return no errors for env vars with plain name/value pairs', () => {
    const deployment = createDeployment([
      { name: 'FOO', value: 'bar' },
      { name: 'BAZ', value: 'qux' },
    ]);
    expect(validateExtraction(deployment)).toEqual([]);
  });

  it('should return no errors when there are no env vars', () => {
    const deployment = createDeployment(undefined);
    expect(validateExtraction(deployment)).toEqual([]);
  });

  it('should return no errors for empty env vars array', () => {
    const deployment = createDeployment([]);
    expect(validateExtraction(deployment)).toEqual([]);
  });

  it('should return an error when env vars use valueFrom with fieldRef', () => {
    const deployment = createDeployment([
      {
        name: 'POD_NAME',
        valueFrom: { fieldRef: { apiVersion: 'v1', fieldPath: 'metadata.name' } },
      },
    ]);
    const errors = validateExtraction(deployment);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('valueFrom');
  });

  it('should return an error when env vars use valueFrom with secretKeyRef', () => {
    const deployment = createDeployment([
      {
        name: 'SECRET_VAL',
        valueFrom: { secretKeyRef: { name: 'my-secret', key: 'password' } },
      },
    ]);
    const errors = validateExtraction(deployment);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('valueFrom');
  });

  it('should return an error when env vars use valueFrom with configMapKeyRef', () => {
    const deployment = createDeployment([
      {
        name: 'CONFIG_VAL',
        valueFrom: { configMapKeyRef: { name: 'my-config', key: 'setting' } },
      },
    ]);
    const errors = validateExtraction(deployment);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('valueFrom');
  });

  it('should return an error when mix of plain and valueFrom env vars exist', () => {
    const deployment = createDeployment([
      { name: 'PLAIN_VAR', value: 'hello' },
      {
        name: 'POD_NAME',
        valueFrom: { fieldRef: { fieldPath: 'metadata.name' } },
      },
    ]);
    const errors = validateExtraction(deployment);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('valueFrom');
  });

  it('should return only one error even with multiple valueFrom env vars', () => {
    const deployment = createDeployment([
      {
        name: 'POD_NAME',
        valueFrom: { fieldRef: { fieldPath: 'metadata.name' } },
      },
      {
        name: 'POD_NS',
        valueFrom: { fieldRef: { fieldPath: 'metadata.namespace' } },
      },
    ]);
    const errors = validateExtraction(deployment);
    expect(errors).toHaveLength(1);
  });
});

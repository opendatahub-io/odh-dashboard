import type { NIMDeployment } from '../../../../api/nimservices/types';
import type { NIMImageFieldValue } from '../NIMImageField';
import { applyNIMImageFieldData, extractNIMImageFieldData } from '../nimImageApplyExtract';

const makeDeployment = (repository: string, tag?: string): NIMDeployment => ({
  modelServingPlatformId: 'nvidia-nim',
  model: {
    apiVersion: 'apps.nvidia.com/v1alpha1',
    kind: 'NIMService',
    metadata: { name: 'test', namespace: 'ns' },
    spec: {
      image: { repository, ...(tag !== undefined && { tag }) },
    },
  },
});

describe('applyNIMImageFieldData', () => {
  it('should set image repository and tag on the deployment', () => {
    const deployment = makeDeployment('', '');
    const fieldData: NIMImageFieldValue = {
      repository: 'nvcr.io/nim/meta/llama-3.2-1b-instruct',
      tag: '1.8',
    };

    const result = applyNIMImageFieldData(deployment, fieldData);

    expect(result.model.spec.image.repository).toBe('nvcr.io/nim/meta/llama-3.2-1b-instruct');
    expect(result.model.spec.image.tag).toBe('1.8');
  });

  it('should preserve other spec fields', () => {
    const deployment = makeDeployment('old-repo', 'old-tag');
    deployment.model.spec.replicas = 3;
    deployment.model.spec.authSecret = 'my-secret';

    const result = applyNIMImageFieldData(deployment, {
      repository: 'new-repo',
      tag: 'new-tag',
    });

    expect(result.model.spec.replicas).toBe(3);
    expect(result.model.spec.authSecret).toBe('my-secret');
    expect(result.model.spec.image.repository).toBe('new-repo');
  });

  it('should not mutate the original deployment', () => {
    const deployment = makeDeployment('original', '1.0');
    applyNIMImageFieldData(deployment, { repository: 'changed', tag: '2.0' });

    expect(deployment.model.spec.image.repository).toBe('original');
    expect(deployment.model.spec.image.tag).toBe('1.0');
  });
});

describe('extractNIMImageFieldData', () => {
  it('should extract repository and tag from the deployment', () => {
    const deployment = makeDeployment('nvcr.io/nim/meta/llama-3.2-1b-instruct', '1.8');
    const result = extractNIMImageFieldData(deployment);

    expect(result).toEqual({
      repository: 'nvcr.io/nim/meta/llama-3.2-1b-instruct',
      tag: '1.8',
    });
  });

  it('should return undefined when repository is empty', () => {
    const deployment = makeDeployment('');
    expect(extractNIMImageFieldData(deployment)).toBeUndefined();
  });

  it('should default tag to empty string when undefined', () => {
    const deployment = makeDeployment('nvcr.io/nim/meta/llama');
    const result = extractNIMImageFieldData(deployment);

    expect(result).toEqual({
      repository: 'nvcr.io/nim/meta/llama',
      tag: '',
    });
  });
});

describe('applyNIMImageFieldData + extractNIMImageFieldData round-trip', () => {
  it('should round-trip correctly', () => {
    const original: NIMImageFieldValue = {
      repository: 'nvcr.io/nim/meta/llama-3.2-1b-instruct',
      tag: '1.8',
    };

    const deployment = makeDeployment('', '');
    const applied = applyNIMImageFieldData(deployment, original);
    const extracted = extractNIMImageFieldData(applied);

    expect(extracted).toEqual(original);
  });
});

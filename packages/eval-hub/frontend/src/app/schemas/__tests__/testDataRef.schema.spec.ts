/* eslint-disable camelcase -- wire-format field names */
import type { z } from 'zod';
import type { TestDataRefType } from '~/app/types';
import {
  parseTestDataRef,
  refineTestDataRef,
  serializeTestDataRef,
  testDataRefDefaultValues,
  testDataRefFormSchema,
  type TestDataRefRefinementCtx,
} from '~/app/schemas/testDataRef.schema';

type TestDataRefIssue = { path: (string | number)[]; message: string };

const collectIssues = (
  values: z.infer<typeof testDataRefFormSchema>,
  isRequired = false,
): TestDataRefIssue[] => {
  const issues: TestDataRefIssue[] = [];
  const ctx: TestDataRefRefinementCtx = {
    addIssue: (issue) => {
      issues.push({ path: issue.path ?? [], message: issue.message });
    },
  };
  refineTestDataRef(values, ctx, ['testDataRef'], isRequired);
  return issues;
};

const fieldErrors = (values: z.infer<typeof testDataRefFormSchema>): Record<string, string> => {
  const result: Record<string, string> = {};
  collectIssues(values).forEach(({ path, message }) => {
    result[String(path[path.length - 1])] = message;
  });
  return result;
};

describe('refineTestDataRef', () => {
  it('should raise no issues when the source is none', () => {
    expect(collectIssues({ ...testDataRefDefaultValues })).toEqual([]);
  });

  it('should raise a source issue when required and the source is none', () => {
    expect(collectIssues({ ...testDataRefDefaultValues }, true)).toEqual([
      {
        path: ['testDataRef', 'source'],
        message: 'Test data source is required for this benchmark.',
      },
    ]);
  });

  it('should raise no source issue when required and a source is selected', () => {
    expect(
      collectIssues(
        {
          ...testDataRefDefaultValues,
          source: 's3',
          bucket: 'eval-data',
          key: 'k',
          secretRef: 's',
        },
        true,
      ),
    ).toEqual([]);
  });

  describe('s3', () => {
    const s3Values = {
      ...testDataRefDefaultValues,
      source: 's3' as const,
      bucket: 'eval-data',
      key: 'ragas/dataset.jsonl',
      secretRef: 'my-s3-secret',
    };

    it('should raise no issues for a complete s3 ref', () => {
      expect(collectIssues(s3Values)).toEqual([]);
    });

    it('should require bucket, key, and secret', () => {
      const errors = fieldErrors({
        ...testDataRefDefaultValues,
        source: 's3',
        bucket: '  ',
        key: '',
        secretRef: '',
      });
      expect(errors.bucket).toBe('Bucket is required.');
      expect(errors.key).toBe('Key is required.');
      expect(errors.secretRef).toBe('Secret is required.');
    });

    it('should reject invalid bucket names', () => {
      const errors = fieldErrors({ ...s3Values, bucket: 'Invalid_Bucket' });
      expect(errors.bucket).toContain('Bucket must be 3-63 characters');
    });

    it('should reject keys with a leading slash', () => {
      const errors = fieldErrors({ ...s3Values, key: '/leading/slash' });
      expect(errors.key).toBe('Key must be relative and must not contain "..".');
    });

    it('should reject keys with path traversal segments', () => {
      const errors = fieldErrors({ ...s3Values, key: 'a/../../etc' });
      expect(errors.key).toBe('Key must be relative and must not contain "..".');
    });
  });

  describe('pvc', () => {
    const pvcValues = {
      ...testDataRefDefaultValues,
      source: 'pvc' as const,
      claimName: 'eval-datasets-pvc',
      subPath: 'benchmark-a',
    };

    it('should raise no issues for a complete pvc ref', () => {
      expect(collectIssues(pvcValues)).toEqual([]);
    });

    it('should require claim name', () => {
      const errors = fieldErrors({ ...testDataRefDefaultValues, source: 'pvc' });
      expect(errors.claimName).toBe('Claim name is required.');
    });

    it('should reject non-DNS-label claim names', () => {
      const errors = fieldErrors({ ...pvcValues, claimName: 'Invalid_Name' });
      expect(errors.claimName).toContain('Claim name must be a DNS label');
    });

    it('should reject claim names longer than 63 characters', () => {
      const errors = fieldErrors({ ...pvcValues, claimName: 'a'.repeat(64) });
      expect(errors.claimName).toContain('Claim name must be a DNS label');
    });

    it('should reject sub paths with a leading slash', () => {
      const errors = fieldErrors({ ...pvcValues, subPath: '/abs' });
      expect(errors.subPath).toBe('Sub path must be relative and must not contain "..".');
    });

    it('should reject sub paths with path traversal segments', () => {
      const errors = fieldErrors({ ...pvcValues, subPath: 'a/../../b' });
      expect(errors.subPath).toBe('Sub path must be relative and must not contain "..".');
    });
  });

  describe('git', () => {
    const gitValues = {
      ...testDataRefDefaultValues,
      source: 'git' as const,
      url: 'https://github.com/org/datasets.git',
      ref: 'main',
    };

    it('should raise no issues for a complete git ref', () => {
      expect(collectIssues(gitValues)).toEqual([]);
    });

    it('should require url and ref', () => {
      const errors = fieldErrors({ ...testDataRefDefaultValues, source: 'git' });
      expect(errors.url).toBe('Repository URL is required.');
      expect(errors.ref).toBe('Ref is required.');
    });

    it('should reject SSH urls', () => {
      const errors = fieldErrors({ ...gitValues, url: 'git@github.com:org/repo.git' });
      expect(errors.url).toBe(
        'Repository URL must use HTTP or HTTPS (SSH URLs are not supported).',
      );
    });

    it('should reject urls with embedded credentials', () => {
      const errors = fieldErrors({
        ...gitValues,
        url: 'https://user:token@github.com/org/datasets.git',
      });
      expect(errors.url).toBe(
        'Repository URL must not contain embedded credentials (username or password).',
      );
    });

    it('should reject http urls with embedded credentials and no secret', () => {
      const errors = fieldErrors({
        ...gitValues,
        url: 'http://user:token@git.example.com/repo.git',
      });
      expect(errors.url).toBe(
        'Repository URL must not contain embedded credentials (username or password).',
      );
    });

    it('should allow urls with an @ after the host', () => {
      expect(collectIssues({ ...gitValues, url: 'https://github.com/org/repo@main.git' })).toEqual(
        [],
      );
    });

    it('should require https when a secret is set', () => {
      const errors = fieldErrors({
        ...gitValues,
        url: 'http://github.com/org/datasets.git',
        secretRef: 'git-auth',
      });
      expect(errors.secretRef).toBe('Secret requires an HTTPS repository URL.');
    });

    it('should not raise the secret https issue when the url is blank', () => {
      const errors = fieldErrors({
        ...testDataRefDefaultValues,
        source: 'git',
        ref: 'main',
        secretRef: 'git-auth',
      });
      expect(errors.url).toBe('Repository URL is required.');
      expect(errors.secretRef).toBeUndefined();
    });

    it('should allow an uppercase HTTPS scheme with a secret', () => {
      expect(
        collectIssues({
          ...gitValues,
          url: 'HTTPS://github.com/org/datasets.git',
          secretRef: 'git-auth',
        }),
      ).toEqual([]);
    });

    it('should allow https with a secret', () => {
      expect(collectIssues({ ...gitValues, secretRef: 'git-auth' })).toEqual([]);
    });

    it('should reject sub paths with path traversal segments', () => {
      const errors = fieldErrors({ ...gitValues, subPath: '../../etc' });
      expect(errors.subPath).toBe('Sub path must be relative and must not contain "..".');
    });
  });

  describe('hf', () => {
    const hfValues = {
      ...testDataRefDefaultValues,
      source: 'hf' as const,
      repoId: 'cais/mmlu',
      revision: 'main',
    };

    it('should raise no issues for a complete hf ref', () => {
      expect(collectIssues(hfValues)).toEqual([]);
    });

    it('should require repo id', () => {
      const errors = fieldErrors({ ...testDataRefDefaultValues, source: 'hf' });
      expect(errors.repoId).toBe('Repository ID is required.');
    });

    it('should reject repo ids without an owner', () => {
      const errors = fieldErrors({ ...hfValues, repoId: 'just-a-repo' });
      expect(errors.repoId).toBe('Repository ID must be in the format owner/repo.');
    });

    it('should reject sub paths with path traversal segments', () => {
      const errors = fieldErrors({ ...hfValues, subPath: 'a/../..\\b' });
      expect(errors.subPath).toBe('Sub path must be relative and must not contain "..".');
    });
  });
});

describe('serializeTestDataRef', () => {
  it('should return undefined when the source is none', () => {
    expect(serializeTestDataRef({ ...testDataRefDefaultValues })).toBeUndefined();
  });

  it('should serialize s3 with type data_set', () => {
    expect(
      serializeTestDataRef({
        ...testDataRefDefaultValues,
        source: 's3',
        bucket: ' eval-data ',
        key: ' ragas/data.jsonl ',
        secretRef: ' my-secret ',
      }),
    ).toEqual({
      s3: {
        bucket: 'eval-data',
        key: 'ragas/data.jsonl',
        secret_ref: 'my-secret',
        type: 'data_set',
      },
    });
  });

  it('should serialize pvc and strip empty optionals', () => {
    expect(
      serializeTestDataRef({
        ...testDataRefDefaultValues,
        source: 'pvc',
        claimName: 'eval-datasets-pvc',
        subPath: '   ',
      }),
    ).toEqual({ pvc: { claim_name: 'eval-datasets-pvc', type: 'data_set' } });
  });

  it('should serialize git with optionals', () => {
    expect(
      serializeTestDataRef({
        ...testDataRefDefaultValues,
        source: 'git',
        url: 'https://github.com/org/repo.git',
        ref: 'v1.0.0',
        subPath: 'data',
        secretRef: 'git-auth',
      }),
    ).toEqual({
      git: {
        url: 'https://github.com/org/repo.git',
        ref: 'v1.0.0',
        sub_path: 'data',
        secret_ref: 'git-auth',
        type: 'data_set',
      },
    });
  });

  it('should serialize hf and strip empty optionals', () => {
    expect(
      serializeTestDataRef({
        ...testDataRefDefaultValues,
        source: 'hf',
        repoId: 'cais/mmlu',
        revision: '  ',
      }),
    ).toEqual({ hf: { repo_id: 'cais/mmlu', type: 'data_set' } });
  });

  it('should preserve a parsed pre_recorded_data type', () => {
    expect(
      serializeTestDataRef({
        ...testDataRefDefaultValues,
        source: 'git',
        url: 'https://github.com/org/repo.git',
        ref: 'v1.0.0',
        type: 'pre_recorded_data',
      }),
    ).toEqual({
      git: { url: 'https://github.com/org/repo.git', ref: 'v1.0.0', type: 'pre_recorded_data' },
    });
  });
});

describe('parseTestDataRef', () => {
  it('should return defaults for undefined input', () => {
    expect(parseTestDataRef(undefined)).toEqual(testDataRefDefaultValues);
  });

  it('should return defaults when no variant is present', () => {
    expect(parseTestDataRef({})).toEqual(testDataRefDefaultValues);
  });

  it('should parse each variant', () => {
    expect(parseTestDataRef({ s3: { bucket: 'b', key: 'k', secret_ref: 's' } })).toEqual({
      ...testDataRefDefaultValues,
      source: 's3',
      bucket: 'b',
      key: 'k',
      secretRef: 's',
    });
    expect(parseTestDataRef({ pvc: { claim_name: 'c', sub_path: 'p' } })).toEqual({
      ...testDataRefDefaultValues,
      source: 'pvc',
      claimName: 'c',
      subPath: 'p',
    });
    expect(
      parseTestDataRef({ git: { url: 'u', ref: 'r', sub_path: 'p', secret_ref: 's' } }),
    ).toEqual({
      ...testDataRefDefaultValues,
      source: 'git',
      url: 'u',
      ref: 'r',
      subPath: 'p',
      secretRef: 's',
    });
    expect(
      parseTestDataRef({ hf: { repo_id: 'o/r', revision: 'v', sub_path: 'p', secret_ref: 's' } }),
    ).toEqual({
      ...testDataRefDefaultValues,
      source: 'hf',
      repoId: 'o/r',
      revision: 'v',
      subPath: 'p',
      secretRef: 's',
    });
  });

  it('should preserve the reference type of each variant', () => {
    expect(
      parseTestDataRef({
        s3: { bucket: 'b', key: 'k', secret_ref: 's', type: 'pre_recorded_data' },
      }),
    ).toEqual({
      ...testDataRefDefaultValues,
      source: 's3',
      type: 'pre_recorded_data',
      bucket: 'b',
      key: 'k',
      secretRef: 's',
    });
    expect(parseTestDataRef({ pvc: { claim_name: 'c', type: 'data_set' } })).toEqual({
      ...testDataRefDefaultValues,
      source: 'pvc',
      type: 'data_set',
      claimName: 'c',
    });
  });

  it('should ignore an unrecognized reference type', () => {
    expect(parseTestDataRef({ hf: { repo_id: 'o/r', type: 'bogus' as TestDataRefType } })).toEqual({
      ...testDataRefDefaultValues,
      source: 'hf',
      repoId: 'o/r',
    });
  });
});

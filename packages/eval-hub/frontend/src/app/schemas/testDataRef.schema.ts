import * as z from 'zod';
import type { TestDataRef, TestDataRefType } from '~/app/types';

export const TEST_DATA_REF_SOURCES = ['s3', 'pvc', 'git', 'hf'] as const;
export type TestDataRefSource = (typeof TEST_DATA_REF_SOURCES)[number];

export type TestDataRefFormField =
  | 'source'
  | 'bucket'
  | 'key'
  | 'secretRef'
  | 'claimName'
  | 'subPath'
  | 'url'
  | 'ref'
  | 'repoId'
  | 'revision';

// `type` is a passthrough of the wire ref type so edit/copy flows keep pre_recorded_data;
// '' means no value was parsed and serialization falls back to data_set.
export type TestDataRefFormValues = z.infer<typeof testDataRefFormSchema>;

export const testDataRefFormSchema = z.object({
  source: z.enum(['', ...TEST_DATA_REF_SOURCES]),
  type: z.enum(['', 'data_set', 'pre_recorded_data']),
  bucket: z.string(),
  key: z.string(),
  secretRef: z.string(),
  claimName: z.string(),
  subPath: z.string(),
  url: z.string(),
  ref: z.string(),
  repoId: z.string(),
  revision: z.string(),
});

export const testDataRefDefaultValues: TestDataRefFormValues = {
  source: '',
  type: '',
  bucket: '',
  key: '',
  secretRef: '',
  claimName: '',
  subPath: '',
  url: '',
  ref: '',
  repoId: '',
  revision: '',
};

const TEST_DATA_REF_SOURCE_OPTIONS: readonly string[] = ['', ...TEST_DATA_REF_SOURCES];

export const isTestDataRefSource = (value: string): value is TestDataRefFormValues['source'] =>
  TEST_DATA_REF_SOURCE_OPTIONS.includes(value);

export const TEST_DATA_REF_FIELDS: readonly TestDataRefFormField[] = [
  'source',
  'bucket',
  'key',
  'secretRef',
  'claimName',
  'subPath',
  'url',
  'ref',
  'repoId',
  'revision',
];

/**
 * Flattens react-hook-form field errors for testDataRef into a field -> message map.
 * Accepts the loosely-typed error object RHF produces for the testDataRef shape.
 */
export const toTestDataRefFieldErrors = (
  errors: Partial<Record<TestDataRefFormField, { message?: unknown }>> | undefined,
): Partial<Record<TestDataRefFormField, string>> | undefined => {
  if (!errors) {
    return undefined;
  }
  const result: Partial<Record<TestDataRefFormField, string>> = {};
  TEST_DATA_REF_FIELDS.forEach((field) => {
    const message = errors[field]?.message;
    if (typeof message === 'string') {
      result[field] = message;
    }
  });
  return Object.keys(result).length > 0 ? result : undefined;
};

/**
 * Computes field -> message errors directly from form values. Use where RHF's
 * formState.errors does not surface nested superRefine issues (the run form's
 * onChange resolver only applies the error for the field that changed).
 */
export const getTestDataRefFieldErrors = (
  values: TestDataRefFormValues,
  isRequired = false,
): Partial<Record<TestDataRefFormField, string>> | undefined => {
  const result: Partial<Record<TestDataRefFormField, string>> = {};
  refineTestDataRef(
    values,
    {
      addIssue: (issue) => {
        const field = issue.path?.[issue.path.length - 1];
        const matched = TEST_DATA_REF_FIELDS.find((candidate) => candidate === field);
        if (matched) {
          result[matched] = issue.message;
        }
      },
    },
    [],
    isRequired,
  );
  return Object.keys(result).length > 0 ? result : undefined;
};

const S3_BUCKET_PATTERN = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
const RFC_1123_LABEL_PATTERN = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const HF_REPO_ID_PATTERN = /^[\w.-]+\/[\w.-]+$/;

const isBlank = (value: string | undefined): boolean => !value || value.trim() === '';

const hasPathTraversal = (value: string): boolean =>
  value.split(/[\\/]/).some((segment) => segment.trim() === '..');

/**
 * Minimal structural context refineTestDataRef needs from zod's superRefine —
 * keeps the function testable with a plain object.
 */
export type TestDataRefRefinementCtx = {
  addIssue: (issue: { code: 'custom'; message: string; path?: (string | number)[] }) => void;
};

/**
 * Adds zod issues for the active source's required and format rules.
 * No-op on field rules when the source is '' (None); when `isRequired` is true
 * (benchmark cannot run without caller-supplied input), an unselected source is
 * itself an issue.
 * `path` is the prefix to the testDataRef field in the parent schema
 * (e.g. ['benchmarks', index, 'testDataRef'] or ['testDataRef']).
 */
export const refineTestDataRef = (
  values: TestDataRefFormValues,
  ctx: TestDataRefRefinementCtx,
  path: (string | number)[],
  isRequired = false,
): void => {
  const addIssue = (field: TestDataRefFormField, message: string): void => {
    ctx.addIssue({ code: 'custom', message, path: [...path, field] });
  };

  if (isRequired && values.source === '') {
    addIssue('source', 'Test data source is required for this benchmark.');
  }

  switch (values.source) {
    case 's3':
      if (isBlank(values.bucket)) {
        addIssue('bucket', 'Bucket is required.');
      } else if (!S3_BUCKET_PATTERN.test(values.bucket.trim())) {
        addIssue(
          'bucket',
          'Bucket must be 3-63 characters using lowercase letters, numbers, dots, and hyphens.',
        );
      }
      if (isBlank(values.key)) {
        addIssue('key', 'Key is required.');
      } else if (values.key.trim().startsWith('/') || hasPathTraversal(values.key)) {
        addIssue('key', 'Key must be relative and must not contain "..".');
      }
      if (isBlank(values.secretRef)) {
        addIssue('secretRef', 'Secret is required.');
      }
      break;
    case 'pvc':
      if (isBlank(values.claimName)) {
        addIssue('claimName', 'Claim name is required.');
      } else if (
        values.claimName.trim().length > 63 ||
        !RFC_1123_LABEL_PATTERN.test(values.claimName.trim())
      ) {
        addIssue(
          'claimName',
          'Claim name must be a DNS label (lowercase alphanumeric or hyphens, max 63 characters).',
        );
      }
      if (!isBlank(values.subPath)) {
        const subPath = values.subPath.trim();
        if (subPath.startsWith('/') || hasPathTraversal(subPath)) {
          addIssue('subPath', 'Sub path must be relative and must not contain "..".');
        }
      }
      break;
    case 'git':
      if (isBlank(values.url)) {
        addIssue('url', 'Repository URL is required.');
      } else if (!/^https?:\/\//i.test(values.url.trim())) {
        addIssue('url', 'Repository URL must use HTTP or HTTPS (SSH URLs are not supported).');
      } else if (/^https?:\/\/[^/@]*@/i.test(values.url.trim())) {
        addIssue(
          'url',
          'Repository URL must not contain embedded credentials (username or password).',
        );
      }
      if (isBlank(values.ref)) {
        addIssue('ref', 'Ref is required.');
      }
      if (!isBlank(values.subPath)) {
        const subPath = values.subPath.trim();
        if (subPath.startsWith('/') || hasPathTraversal(subPath)) {
          addIssue('subPath', 'Sub path must be relative and must not contain "..".');
        }
      }
      if (
        !isBlank(values.secretRef) &&
        !isBlank(values.url) &&
        !/^https:\/\//i.test(values.url.trim())
      ) {
        addIssue('secretRef', 'Secret requires an HTTPS repository URL.');
      }
      break;
    case 'hf':
      if (isBlank(values.repoId)) {
        addIssue('repoId', 'Repository ID is required.');
      } else if (!HF_REPO_ID_PATTERN.test(values.repoId.trim())) {
        addIssue('repoId', 'Repository ID must be in the format owner/repo.');
      }
      if (!isBlank(values.subPath)) {
        const subPath = values.subPath.trim();
        if (subPath.startsWith('/') || hasPathTraversal(subPath)) {
          addIssue('subPath', 'Sub path must be relative and must not contain "..".');
        }
      }
      break;
    case '':
    default:
      break;
  }
};

/* eslint-disable camelcase */
/**
 * Maps the flat form shape to the wire format. The reference type parsed from
 * the original wire ref is preserved (edit/copy flows keep pre_recorded_data);
 * when absent — refs created fresh in the UI — it falls back to data_set.
 */
export const serializeTestDataRef = (form: TestDataRefFormValues): TestDataRef | undefined => {
  const subPath = form.subPath.trim();
  const secretRef = form.secretRef.trim();
  const refType = form.type || 'data_set';
  switch (form.source) {
    case 's3':
      return {
        s3: {
          bucket: form.bucket.trim(),
          key: form.key.trim(),
          secret_ref: form.secretRef.trim(),
          type: refType,
        },
      };
    case 'pvc':
      return {
        pvc: {
          claim_name: form.claimName.trim(),
          ...(subPath ? { sub_path: subPath } : {}),
          type: refType,
        },
      };
    case 'git':
      return {
        git: {
          url: form.url.trim(),
          ref: form.ref.trim(),
          ...(subPath ? { sub_path: subPath } : {}),
          ...(secretRef ? { secret_ref: secretRef } : {}),
          type: refType,
        },
      };
    case 'hf':
      return {
        hf: {
          repo_id: form.repoId.trim(),
          ...(form.revision.trim() ? { revision: form.revision.trim() } : {}),
          ...(subPath ? { sub_path: subPath } : {}),
          ...(secretRef ? { secret_ref: secretRef } : {}),
          type: refType,
        },
      };
    case '':
    default:
      return undefined;
  }
};
/* eslint-enable camelcase */

// The BFF passes the wire type through as a free-form string; only known
// values are carried into the form so serialization never emits junk.
const toFormRefType = (value: TestDataRefType | undefined): '' | TestDataRefType =>
  value === 'data_set' || value === 'pre_recorded_data' ? value : '';

export const parseTestDataRef = (wire: TestDataRef | undefined): TestDataRefFormValues => {
  const values = { ...testDataRefDefaultValues };
  if (!wire) {
    return values;
  }
  if (wire.s3) {
    return {
      ...values,
      source: 's3',
      type: toFormRefType(wire.s3.type),
      bucket: wire.s3.bucket ?? '',
      key: wire.s3.key ?? '',
      secretRef: wire.s3.secret_ref ?? '',
    };
  }
  if (wire.pvc) {
    return {
      ...values,
      source: 'pvc',
      type: toFormRefType(wire.pvc.type),
      claimName: wire.pvc.claim_name ?? '',
      subPath: wire.pvc.sub_path ?? '',
    };
  }
  if (wire.git) {
    return {
      ...values,
      source: 'git',
      type: toFormRefType(wire.git.type),
      url: wire.git.url ?? '',
      ref: wire.git.ref ?? '',
      subPath: wire.git.sub_path ?? '',
      secretRef: wire.git.secret_ref ?? '',
    };
  }
  if (wire.hf) {
    return {
      ...values,
      source: 'hf',
      type: toFormRefType(wire.hf.type),
      repoId: wire.hf.repo_id ?? '',
      revision: wire.hf.revision ?? '',
      subPath: wire.hf.sub_path ?? '',
      secretRef: wire.hf.secret_ref ?? '',
    };
  }
  return values;
};

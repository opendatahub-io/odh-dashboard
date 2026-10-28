import * as React from 'react';
import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuToggle,
  Select,
  SelectOption,
  SelectList,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import {
  isTestDataRefSource,
  TEST_DATA_REF_SOURCES,
  testDataRefDefaultValues,
  type TestDataRefFormValues,
  type TestDataRefFormField,
  type TestDataRefSource,
} from '~/app/schemas/testDataRef.schema';

import './BenchmarkTestDataRefFields.scss';

type BenchmarkTestDataRefFieldsProps = {
  value: TestDataRefFormValues;
  idPrefix: string;
  testIdPrefix: string;
  isDisabled?: boolean;
  isRequired?: boolean;
  errors?: Partial<Record<TestDataRefFormField, string>>;
  onChange: (value: TestDataRefFormValues) => void;
};

type FieldConfig = {
  field: TestDataRefFormField;
  label: string;
  placeholder?: string;
  required: boolean;
  helperText?: string;
};

const SOURCE_LABELS: Record<TestDataRefFormValues['source'], string> = {
  '': 'None (use benchmark default data)',
  s3: 'S3 — object storage',
  pvc: 'Persistent volume claim (PVC)',
  git: 'Git repository',
  hf: 'Hugging Face dataset',
};

const SOURCE_CONTEXT: Record<TestDataRefSource, string> = {
  s3: 'An init container downloads all objects under the key prefix from S3 or S3-compatible storage, using credentials from a required secret.',
  pvc: 'An existing PersistentVolumeClaim in the evaluation job namespace is mounted read-only; the data must already reside on it.',
  git: 'The repository is cloned over HTTP(S) at the given reference (SSH URLs are unsupported); the resolved commit SHA is recorded for reproducibility.',
  hf: 'The dataset is downloaded by repository ID; public repositories need no secret, while gated ones require an Opaque secret with a token key.',
};

const FIELDS_BY_SOURCE: Record<TestDataRefSource, FieldConfig[]> = {
  s3: [
    { field: 'bucket', label: 'Bucket', required: true, placeholder: 'eval-data' },
    {
      field: 'key',
      label: 'Object key or prefix',
      required: true,
      placeholder: 'datasets/benchmark-a/v1',
      helperText:
        'All objects under the key or prefix are downloaded into /test_data, preserving subdirectory structure.',
    },
    {
      field: 'secretRef',
      label: 'Secret',
      required: true,
      placeholder: 'my-s3-connection-secret',
      helperText:
        'Secret in the evaluation job namespace containing AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION, and AWS_S3_ENDPOINT keys; ODH S3 connection secrets qualify.',
    },
  ],
  pvc: [
    {
      field: 'claimName',
      label: 'Claim name',
      required: true,
      placeholder: 'eval-datasets-pvc',
      helperText:
        'Must already exist in the evaluation job namespace and contain the data; Eval Hub does not create or manage it.',
    },
    {
      field: 'subPath',
      label: 'Sub path',
      required: false,
      placeholder: 'benchmark-a/v1',
      helperText:
        'Path within the claim to mount instead of its root; useful when one PVC holds data for multiple benchmarks.',
    },
  ],
  git: [
    {
      field: 'url',
      label: 'Repository URL',
      required: true,
      placeholder: 'https://github.com/my-org/my-eval-datasets.git',
      helperText:
        'HTTP(S) only; SSH URLs are unsupported. Plain http:// is allowed only for unauthenticated clones.',
    },
    {
      field: 'ref',
      label: 'Git reference',
      required: true,
      placeholder: 'main',
      helperText: 'Branch, tag, or commit SHA to check out.',
    },
    {
      field: 'subPath',
      label: 'Sub path',
      required: false,
      placeholder: 'benchmark-a/v1',
      helperText: 'Path within the repository to mount instead of its root.',
    },
    {
      field: 'secretRef',
      label: 'Secret',
      required: false,
      helperText:
        'kubernetes.io/basic-auth secret in the evaluation job namespace; omit for public repositories.',
    },
  ],
  hf: [
    { field: 'repoId', label: 'Repository ID', required: true, placeholder: 'cais/mmlu' },
    {
      field: 'revision',
      label: 'Revision',
      required: false,
      placeholder: 'main',
      helperText: 'Branch, tag, or commit SHA; the repository default branch is used when omitted.',
    },
    {
      field: 'subPath',
      label: 'Sub path',
      required: false,
      placeholder: 'benchmark-a/v1',
      helperText: 'Path within the repository to mount instead of its root.',
    },
    {
      field: 'secretRef',
      label: 'Secret',
      required: false,
      helperText:
        'Opaque secret containing a token key in the evaluation job namespace; omit for public repositories.',
    },
  ],
};

const BenchmarkTestDataRefFields: React.FC<BenchmarkTestDataRefFieldsProps> = ({
  value,
  idPrefix,
  testIdPrefix,
  isDisabled = false,
  isRequired = false,
  errors,
  onChange,
}) => {
  const [sourceOpen, setSourceOpen] = React.useState(false);
  // Errors come from form-level validation, which runs as soon as any field in the form
  // changes. Hide them until the user interacts with the field so switching the source
  // does not flag every dependent field as missing before it has been visited.
  const [touched, setTouched] = React.useState<Partial<Record<TestDataRefFormField, boolean>>>({});
  const fields = value.source ? FIELDS_BY_SOURCE[value.source] : [];
  const sourceError = isRequired && touched.source ? errors?.source : undefined;

  const markTouched = (field: TestDataRefFormField): void => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const handleSourceSelect = (source: TestDataRefFormValues['source']): void => {
    setSourceOpen(false);
    if (source === value.source) {
      return;
    }
    // Changing the source clears all values for the previous source. The
    // reference type is source-independent, so it is preserved.
    onChange({ ...testDataRefDefaultValues, source, type: value.type });
    setTouched({});
  };

  const sourceOptions = isRequired
    ? TEST_DATA_REF_SOURCES
    : (['', ...TEST_DATA_REF_SOURCES] as const);

  return (
    <Stack hasGutter className="evalhub-benchmark-test-data-ref">
      <StackItem>
        <FormGroup
          label="Test data source"
          fieldId={`${idPrefix}-test-data-ref`}
          isRequired={isRequired}
        >
          <Select
            id={`${idPrefix}-test-data-ref-source`}
            data-testid={`${testIdPrefix}-source`}
            isOpen={sourceOpen && !isDisabled}
            selected={value.source}
            onSelect={(_event, selected) => {
              if (typeof selected === 'string' && isTestDataRefSource(selected)) {
                handleSourceSelect(selected);
              }
            }}
            onOpenChange={(isOpen) => {
              if (!isDisabled) {
                if (isOpen) {
                  markTouched('source');
                }
                setSourceOpen(isOpen);
              }
            }}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                onClick={() => {
                  if (!isDisabled) {
                    markTouched('source');
                    setSourceOpen((prev) => !prev);
                  }
                }}
                isExpanded={sourceOpen && !isDisabled}
                isDisabled={isDisabled}
                isFullWidth
                status={sourceError ? 'danger' : undefined}
                data-testid={`${testIdPrefix}-source-toggle`}
              >
                {value.source
                  ? SOURCE_LABELS[value.source]
                  : isRequired
                    ? 'Select a test data source'
                    : SOURCE_LABELS['']}
              </MenuToggle>
            )}
            shouldFocusToggleOnSelect
          >
            <SelectList>
              {sourceOptions.map((source) => (
                <SelectOption
                  key={source || 'none'}
                  value={source}
                  isSelected={value.source === source}
                >
                  {SOURCE_LABELS[source]}
                </SelectOption>
              ))}
            </SelectList>
          </Select>
          <FormHelperText>
            <HelperText>
              {sourceError ? (
                <HelperTextItem variant="error" data-testid={`${testIdPrefix}-source-error`}>
                  {sourceError}
                </HelperTextItem>
              ) : (
                <HelperTextItem data-testid={`${testIdPrefix}-helper`}>
                  {value.source
                    ? `${SOURCE_CONTEXT[value.source]} Data is made available at /test_data in the evaluation container.`
                    : isRequired
                      ? 'This benchmark has no bundled input data — select a source to supply the test data.'
                      : 'Optional: provide external input data for benchmarks that require a dataset.'}
                </HelperTextItem>
              )}
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </StackItem>

      {fields.length > 0 ? (
        <StackItem>
          <Stack hasGutter className="evalhub-benchmark-test-data-ref__children">
            {fields.map(({ field, label, required, placeholder, helperText }) => {
              const error = touched[field] ? errors?.[field] : undefined;
              return (
                <FormGroup
                  key={field}
                  label={label}
                  isRequired={required}
                  fieldId={`${idPrefix}-test-data-ref-${field}`}
                >
                  <TextInput
                    id={`${idPrefix}-test-data-ref-${field}`}
                    data-testid={`${testIdPrefix}-${field}`}
                    type="text"
                    value={value[field]}
                    placeholder={placeholder}
                    isDisabled={isDisabled}
                    validated={error ? 'error' : 'default'}
                    onChange={(_event, fieldValue) => {
                      // Clearing counts as an interaction so required errors surface without a blur.
                      if (fieldValue.trim() === '') {
                        markTouched(field);
                      }
                      onChange({ ...value, [field]: fieldValue });
                    }}
                    onBlur={() => markTouched(field)}
                  />
                  <FormHelperText>
                    <HelperText>
                      {error ? (
                        <HelperTextItem
                          variant="error"
                          data-testid={`${testIdPrefix}-${field}-error`}
                        >
                          {error}
                        </HelperTextItem>
                      ) : helperText ? (
                        <HelperTextItem>{helperText}</HelperTextItem>
                      ) : null}
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
              );
            })}
          </Stack>
        </StackItem>
      ) : null}
    </Stack>
  );
};

export default BenchmarkTestDataRefFields;

import React from 'react';
import {
  Alert,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { z } from 'zod';
import type { FieldValidationProps } from '@odh-dashboard/ui-core/hooks/useZodFormValidation';
import { type ZodIssue } from 'zod';
import { ZodErrorHelperText } from '@odh-dashboard/ui-core/components/ZodErrorFormHelperText';

export type HuggingFaceApiKeyFieldData = {
  token: string;
  configuredSecretName?: string;
};

export const huggingFaceApiKeyFieldSchema = z.object({
  token: z.string(),
  configuredSecretName: z.string().optional(),
});

export const isHuggingFaceApiKeyConfigured = (data?: HuggingFaceApiKeyFieldData): boolean =>
  Boolean(data?.configuredSecretName);

export const requiredHuggingFaceApiKeySchema = huggingFaceApiKeyFieldSchema.superRefine(
  (data, ctx) => {
    if (isHuggingFaceApiKeyConfigured(data)) {
      return;
    }
    if (!data.token.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Hugging Face API key is required',
        path: ['token'],
      });
    }
  },
);

export type HuggingFaceApiKeyFieldHook = {
  data: HuggingFaceApiKeyFieldData | undefined;
  setData: (data: HuggingFaceApiKeyFieldData) => void;
};

export const useHuggingFaceApiKeyField = (
  existingData?: HuggingFaceApiKeyFieldData,
): HuggingFaceApiKeyFieldHook => {
  const [data, setData] = React.useState<HuggingFaceApiKeyFieldData | undefined>(
    existingData ?? { token: '' },
  );

  React.useEffect(() => {
    if (existingData !== undefined) {
      setData(existingData);
    }
  }, [existingData]);

  return { data, setData };
};

const GATED_ACCESS_HELPER_TEXT =
  'This model requires gated access on Hugging Face. Ensure your account has been granted access before deploying.';

type HuggingFaceApiKeyFieldProps = {
  data?: HuggingFaceApiKeyFieldData;
  onChange: (data: HuggingFaceApiKeyFieldData) => void;
  isGated?: boolean;
  validationProps?: FieldValidationProps;
  validationIssues?: ZodIssue[];
};

export const HuggingFaceApiKeyField: React.FC<HuggingFaceApiKeyFieldProps> = ({
  data = { token: '' },
  onChange,
  isGated = false,
  validationProps,
  validationIssues = [],
}) => {
  const hasConfiguredToken = isHuggingFaceApiKeyConfigured(data);
  const hasError = validationIssues.length > 0;

  return (
    <FormGroup label="Hugging Face API key" isRequired data-testid="hf-api-key-field">
      {isGated ? (
        <Alert
          variant="info"
          isInline
          title="Gated model access"
          data-testid="hf-gated-access-alert"
        >
          {GATED_ACCESS_HELPER_TEXT}
        </Alert>
      ) : null}
      {hasConfiguredToken ? (
        <FormHelperText data-testid="hf-api-key-configured-helper">
          <HelperText>
            <HelperTextItem>
              A Hugging Face API key is configured for this deployment. Enter a new key below to
              replace it.
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      ) : null}
      <TextInput
        data-testid="hf-api-key-input"
        aria-label="Hugging Face API key"
        type="password"
        value={data.token}
        required={!hasConfiguredToken}
        onChange={(_event, value) => onChange({ ...data, token: value })}
        validated={hasError ? ValidatedOptions.error : ValidatedOptions.default}
        {...validationProps}
      />
      <ZodErrorHelperText zodIssue={validationIssues} />
      {!hasError ? (
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              Your token is stored in a project secret and is not shown again after deployment.
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      ) : null}
    </FormGroup>
  );
};

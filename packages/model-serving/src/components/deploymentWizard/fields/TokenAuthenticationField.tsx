import React from 'react';
import {
  Alert,
  Button,
  Checkbox,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Split,
  SplitItem,
  Stack,
  StackItem,
  TextInput,
  ValidatedOptions,
  getUniqueId,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { z } from 'zod';
import type { ModelServerSelectField } from './ModelServerTemplateSelectField';
import type { ModelTypeField } from './ModelTypeSelectField';
import type { TokenAuthField } from '../types';

// Schema
const tokenSchema = z.object({
  uuid: z.string(),
  displayName: z.string().min(1, 'Service account name is required'),
  k8sName: z.string().optional(),
  error: z.string().optional(),
});

export const tokenAuthenticationFieldSchema = z.array(tokenSchema);

type TokenSchemaType = z.infer<typeof tokenSchema>;
export type TokenAuthenticationFieldData = z.infer<typeof tokenAuthenticationFieldSchema>;

export const isValidTokenAuthentication = (
  value: unknown,
): value is TokenAuthenticationFieldData => {
  return tokenAuthenticationFieldSchema.safeParse(value).success;
};

// Hook
export type TokenAuthenticationFieldHook = {
  data: TokenAuthenticationFieldData | undefined;
  setData: (data: TokenAuthenticationFieldData) => void;
  shouldAutoCheck: boolean;
};

export const useTokenAuthenticationField = (
  existingData?: TokenAuthenticationFieldData,
  tokenAuthFields?: TokenAuthField[],
  modelType?: ModelTypeField,
  modelServer?: ModelServerSelectField,
): TokenAuthenticationFieldHook => {
  const shouldAutoCheck = React.useMemo(() => {
    if (!modelType || !tokenAuthFields) return false;

    const activeField = tokenAuthFields.find((field) =>
      field.isActive({
        modelType,
        modelServer,
      }),
    );
    return activeField?.initialValue ?? false;
  }, [tokenAuthFields, modelType, modelServer]);

  const initialData = React.useMemo(() => {
    // only auto check on create
    if (shouldAutoCheck && !existingData) {
      return [
        {
          uuid: getUniqueId('ml'),
          displayName: 'default-name',
          error: '',
        },
      ];
    }
    return existingData || [];
  }, [shouldAutoCheck, existingData]);

  const [tokenAuthData, setTokenAuthData] = React.useState<
    TokenAuthenticationFieldData | undefined
  >(initialData);

  const runOnce = React.useRef(false);
  React.useEffect(() => {
    if (runOnce.current === false) {
      runOnce.current = true;
      setTokenAuthData(initialData);
    }
  }, [initialData]);

  return {
    data: tokenAuthData,
    setData: setTokenAuthData,
    shouldAutoCheck,
  };
};

type TokenInputProps = {
  existingTokens: TokenAuthenticationFieldData;
  setTokens?: TokenAuthenticationFieldHook['setData'];
  newToken: TokenSchemaType;
  disabled?: boolean;
};

const TokenInput: React.FC<TokenInputProps> = ({
  existingTokens,
  setTokens,
  newToken,
  disabled,
}) => {
  const checkDuplicates = (name: string): boolean => {
    const duplicates = existingTokens.filter((currentToken) => currentToken.displayName === name);
    return duplicates.length > 0;
  };

  const checkValid = (value: string) => {
    if (value.length === 0) {
      return 'Required';
    }
    if (checkDuplicates(value)) {
      return 'Duplicates are invalid';
    }
    return '';
  };

  return (
    <FormGroup label="Service account name" fieldId="service-account-form-name">
      <Split>
        <SplitItem isFilled>
          <TextInput
            value={newToken.displayName}
            isRequired
            type="text"
            id="service-account-form-name"
            data-testid="service-account-form-name"
            name="service-account-form-name"
            aria-describedby="service-account-form-name-helper"
            validated={newToken.error ? ValidatedOptions.error : ValidatedOptions.default}
            isDisabled={disabled}
            onChange={(e, value) => {
              const tokens = existingTokens.map((item) =>
                item.uuid === newToken.uuid
                  ? {
                      uuid: newToken.uuid,
                      displayName: value,
                      error: checkValid(value),
                    }
                  : item,
              );
              setTokens?.(tokens);
            }}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem
                {...(newToken.error && { icon: <ExclamationCircleIcon />, variant: 'error' })}
              >
                {newToken.error
                  ? newToken.error
                  : 'Enter the service account name for which the token will be generated'}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </SplitItem>
        <SplitItem>
          <Button
            variant="plain"
            aria-label="Remove service account"
            data-testid="remove-service-account-button"
            icon={<MinusCircleIcon />}
            isDisabled={disabled}
            onClick={() => {
              const newTokens = existingTokens.filter((item) => item.uuid !== newToken.uuid);
              setTokens?.(newTokens);
              if (newTokens.length === 0) {
                setTokens?.([]);
              }
            }}
          />
        </SplitItem>
      </Split>
    </FormGroup>
  );
};

// Component
type TokenAuthenticationFieldProps = {
  tokens?: TokenAuthenticationFieldData;
  onChange?: TokenAuthenticationFieldHook['setData'];
  allowCreate?: boolean;
};

export const TokenAuthenticationField: React.FC<TokenAuthenticationFieldProps> = ({
  tokens = [],
  onChange,
  allowCreate = false,
}) => {
  const createNewToken = React.useCallback(() => {
    const displayName = 'default-name';
    const duplicated = tokens.filter((token) => token.displayName === displayName);
    const duplicatedError = duplicated.length > 0 ? 'Duplicates are invalid' : '';

    const newTokens = [
      ...tokens,
      {
        displayName,
        uuid: getUniqueId('ml'),
        error: duplicatedError,
      },
    ];

    onChange?.(newTokens);
  }, [tokens, onChange]);

  return (
    <Stack hasGutter id="auth-section">
      <StackItem>
        <Checkbox
          label={
            <>
              <div className="pf-v6-c-form__label-text">Require token authentication</div>
              Requiring token authentication provides added security if you make your model
              available to users outside of your cluster.
            </>
          }
          id="alt-form-checkbox-auth"
          data-testid="token-authentication-checkbox"
          name="alt-form-checkbox-auth"
          isDisabled={!allowCreate}
          isChecked={tokens.length > 0}
          onChange={(e, check) => {
            if (check && tokens.length === 0) {
              createNewToken();
            } else if (!check) {
              onChange?.([]);
            }
          }}
        />
      </StackItem>
      {tokens.length > 0 && (
        <StackItem>
          <div style={{ marginLeft: 'var(--pf-t--global--spacer--lg)' }}>
            <Stack hasGutter>
              {allowCreate && (
                <StackItem>
                  <Alert
                    variant="info"
                    isInline
                    title="The actual tokens will be created and displayed when the model server is configured."
                  />
                </StackItem>
              )}
              {tokens.map((token) => (
                <StackItem key={token.uuid}>
                  <TokenInput
                    newToken={token}
                    existingTokens={tokens}
                    setTokens={onChange}
                    disabled={!allowCreate}
                  />
                </StackItem>
              ))}
              <StackItem>
                <Button
                  onClick={createNewToken}
                  isInline
                  iconPosition="left"
                  variant="link"
                  icon={<PlusCircleIcon />}
                  isDisabled={!allowCreate}
                  data-testid="add-service-account-button"
                >
                  Add a service account
                </Button>
              </StackItem>
            </Stack>
          </div>
        </StackItem>
      )}
    </Stack>
  );
};

export default TokenAuthenticationField;

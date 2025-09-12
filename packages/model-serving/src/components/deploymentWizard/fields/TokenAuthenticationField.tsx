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

// Schema
const servingRuntimeTokenSchema = z.object({
  uuid: z.string(),
  name: z.string().min(1, 'Service account name is required'),
  error: z.string().optional(),
});

export const tokenAuthenticationFieldSchema = z.object({
  tokens: z.array(servingRuntimeTokenSchema),
});

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
};

export const useTokenAuthenticationField = (
  existingData?: TokenAuthenticationFieldData,
): TokenAuthenticationFieldHook => {
  const [tokenAuthData, setTokenAuthData] = React.useState<
    TokenAuthenticationFieldData | undefined
  >(existingData || { tokens: [] });

  return {
    data: tokenAuthData,
    setData: setTokenAuthData,
  };
};

// Local TokenInput component
type ServingRuntimeToken = {
  uuid: string;
  name: string;
  error?: string;
};

type TokenAuthData = {
  tokenAuth: boolean;
  tokens: ServingRuntimeToken[];
};

type TokenAuthValue = TokenAuthData[keyof TokenAuthData];

type TokenInputProps = {
  data: TokenAuthData;
  setData?: (key: keyof TokenAuthData, value: TokenAuthValue) => void;
  token: ServingRuntimeToken;
  disabled?: boolean;
};

const TokenInput: React.FC<TokenInputProps> = ({ data, setData, token, disabled }) => {
  const checkDuplicates = (name: string): boolean => {
    const duplicates = data.tokens.filter((currentToken) => currentToken.name === name);
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
            value={token.name}
            isRequired
            type="text"
            id="service-account-form-name"
            data-testid="service-account-form-name"
            name="service-account-form-name"
            aria-describedby="service-account-form-name-helper"
            validated={token.error ? ValidatedOptions.error : ValidatedOptions.default}
            isDisabled={disabled}
            onChange={(e, value) => {
              const tokens = data.tokens.map((item) =>
                item.uuid === token.uuid
                  ? {
                      uuid: token.uuid,
                      name: value,
                      error: checkValid(value),
                    }
                  : item,
              );
              setData?.('tokens', tokens);
            }}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem
                {...(token.error && { icon: <ExclamationCircleIcon />, variant: 'error' })}
              >
                {token.error
                  ? token.error
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
              const newTokens = data.tokens.filter((item) => item.uuid !== token.uuid);
              setData?.('tokens', newTokens);
              if (newTokens.length === 0) {
                setData?.('tokenAuth', false);
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
  data?: TokenAuthenticationFieldData;
  onChange?: (
    key: keyof TokenAuthenticationFieldData,
    value: TokenAuthenticationFieldData[keyof TokenAuthenticationFieldData],
  ) => void;
  allowCreate?: boolean;
};

export const TokenAuthenticationField: React.FC<TokenAuthenticationFieldProps> = ({
  data = { tokens: [] },
  onChange,
  allowCreate = false,
}) => {
  const createNewToken = React.useCallback(() => {
    const name = 'default-name';
    const duplicated = data.tokens.filter((token) => token.name === name);
    const duplicatedError = duplicated.length > 0 ? 'Duplicates are invalid' : '';

    const newTokens = [
      ...data.tokens,
      {
        name,
        uuid: getUniqueId('ml'),
        error: duplicatedError,
      },
    ];

    onChange?.('tokens', newTokens);
  }, [data.tokens, onChange]);

  return (
    <FormGroup
      label="Token authentication"
      data-testid="auth-section"
      fieldId="alt-form-checkbox-auth"
    >
      <Stack hasGutter id="auth-section">
        <StackItem>
          <Checkbox
            label="Require token authentication"
            id="alt-form-checkbox-auth"
            data-testid="token-authentication-checkbox"
            name="alt-form-checkbox-auth"
            isDisabled={!allowCreate}
            isChecked={data.tokens.length > 0}
            onChange={(e, check) => {
              if (check && data.tokens.length === 0) {
                createNewToken();
              } else if (!check) {
                onChange?.('tokens', []);
              }
            }}
          />
        </StackItem>
        {data.tokens.length > 0 && (
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
                {data.tokens.map((token) => (
                  <StackItem key={token.uuid}>
                    <TokenInput
                      token={token}
                      data={{ ...data, tokenAuth: data.tokens.length > 0 }}
                      setData={(key, value) => {
                        if (key === 'tokens' && Array.isArray(value)) {
                          onChange?.(key, value);
                        }
                      }}
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
    </FormGroup>
  );
};

export default TokenAuthenticationField;

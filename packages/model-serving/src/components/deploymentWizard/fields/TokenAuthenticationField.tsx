import React from 'react';
import {
  Alert,
  Button,
  Checkbox,
  FormGroup,
  Stack,
  StackItem,
  getUniqueId,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { z } from 'zod';
import TokenInput from './TokenInput';

// Schema
const servingRuntimeTokenSchema = z.object({
  uuid: z.string(),
  name: z.string().min(1, 'Service account name is required'),
  error: z.string().optional(),
});

export const tokenAuthenticationFieldSchema = z.object({
  tokenAuth: z.boolean(),
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
  updateField: (
    key: keyof TokenAuthenticationFieldData,
    value: TokenAuthenticationFieldData[keyof TokenAuthenticationFieldData],
  ) => void;
};

export const useTokenAuthenticationField = (
  existingData?: TokenAuthenticationFieldData,
): TokenAuthenticationFieldHook => {
  const [tokenAuthData, setTokenAuthData] = React.useState<
    TokenAuthenticationFieldData | undefined
  >(existingData || { tokenAuth: false, tokens: [] });

  const updateField = React.useCallback(
    (
      key: keyof TokenAuthenticationFieldData,
      value: TokenAuthenticationFieldData[keyof TokenAuthenticationFieldData],
    ) => {
      setTokenAuthData((prev) => {
        const current = prev || { tokenAuth: false, tokens: [] };
        return {
          ...current,
          [key]: value,
        };
      });
    },
    [],
  );

  return {
    data: tokenAuthData,
    setData: setTokenAuthData,
    updateField,
  };
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
  data = { tokenAuth: false, tokens: [] },
  onChange,
  allowCreate = true,
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
            isChecked={data.tokenAuth}
            onChange={(e, check) => {
              onChange?.('tokenAuth', check);
              if (check && data.tokens.length === 0) {
                createNewToken();
              }
            }}
          />
        </StackItem>
        {data.tokenAuth && (
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
                      data={data}
                      setData={(key, value) => onChange?.(key, value)}
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

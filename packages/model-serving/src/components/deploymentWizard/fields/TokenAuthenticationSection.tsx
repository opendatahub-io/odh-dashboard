import React from 'react';
import { Alert, Button, Checkbox, FormGroup, Stack, StackItem } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import TokenInput, { TokenAuthData } from './TokenInput';

type TokenAuthValue = TokenAuthData[keyof TokenAuthData];

type TokenAuthenticationSectionProps = {
  data: TokenAuthData;
  setData?: (key: keyof TokenAuthData, value: TokenAuthValue) => void;
  allowCreate: boolean;
  createNewToken: () => void;
};

const TokenAuthenticationSection: React.FC<TokenAuthenticationSectionProps> = ({
  data,
  setData,
  allowCreate,
  createNewToken,
}) => (
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
            setData?.('tokenAuth', check);
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
                  <TokenInput token={token} data={data} setData={setData} disabled={!allowCreate} />
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

export default TokenAuthenticationSection;

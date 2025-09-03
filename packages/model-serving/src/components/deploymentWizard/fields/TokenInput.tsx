import React from 'react';
import {
  Button,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Split,
  SplitItem,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, MinusCircleIcon } from '@patternfly/react-icons';

export type ServingRuntimeToken = {
  uuid: string;
  name: string;
  error?: string;
};

export type TokenAuthData = {
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

export default TokenInput;

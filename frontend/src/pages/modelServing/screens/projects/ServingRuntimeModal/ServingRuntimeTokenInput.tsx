import * as React from 'react';
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
import { UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import {
  CreatingModelServingObjectCommon,
  ServingRuntimeToken,
} from '#~/pages/modelServing/screens/types';
import { translateDisplayNameForK8s } from '#~/concepts/k8s/utils';

type ServingRuntimeTokenInputProps<D extends CreatingModelServingObjectCommon> = {
  data: D;
  setData: UpdateObjectAtPropAndValue<D>;
  token: ServingRuntimeToken;
  disabled?: boolean;
};

const ServingRuntimeTokenInput = <D extends CreatingModelServingObjectCommon>({
  data,
  setData,
  token,
  disabled,
}: ServingRuntimeTokenInputProps<D>): React.ReactNode => {
  const checkDuplicates = (name: string): boolean => {
    const duplicates = data.tokens.filter(
      (currentToken) =>
        currentToken.name === name || currentToken.editName === translateDisplayNameForK8s(name),
    );
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
                      editName: token.editName,
                    }
                  : item,
              );
              setData('tokens', tokens);
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
            icon={<MinusCircleIcon />}
            isDisabled={disabled}
            onClick={() => {
              const newTokens = data.tokens.filter((item) => item.uuid !== token.uuid);
              setData('tokens', newTokens);
              if (newTokens.length === 0) {
                setData('tokenAuth', false);
              }
            }}
          />
        </SplitItem>
      </Split>
    </FormGroup>
  );
};

export default ServingRuntimeTokenInput;

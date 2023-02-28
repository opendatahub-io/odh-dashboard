import * as React from 'react';
import {
  Button,
  FormGroup,
  Split,
  SplitItem,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, MinusCircleIcon } from '@patternfly/react-icons';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import {
  CreatingServingRuntimeObject,
  ServingRuntimeToken,
} from '~/pages/modelServing/screens/types';
import { translateDisplayNameForK8s } from '~/pages/projects/utils';

type ServingRuntimeTokenInputProps = {
  data: CreatingServingRuntimeObject;
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
  token: ServingRuntimeToken;
};

const ServingRuntimeTokenInput: React.FC<ServingRuntimeTokenInputProps> = ({
  data,
  setData,
  token,
}) => {
  const checkDuplicates = (name: string): boolean => {
    const duplicates = data.tokens.filter(
      (token) => token.name === name || token.editName === translateDisplayNameForK8s(name),
    );
    return duplicates.length > 0;
  };

  const checkValid = (value: string) => {
    if (value.length === 0) {
      return 'Required';
    } else if (checkDuplicates(value)) {
      return 'Duplicates are invalid';
    }
    return '';
  };

  return (
    <FormGroup
      label="Service account name"
      helperText="Enter the service account name for which the token will be generated"
      helperTextInvalid={token.error}
      helperTextInvalidIcon={<ExclamationCircleIcon />}
      validated={token.error ? ValidatedOptions.error : ValidatedOptions.default}
    >
      <Split>
        <SplitItem isFilled>
          <TextInput
            value={token.name}
            isRequired
            type="text"
            id="simple-form-name-01"
            name="simple-form-name-01"
            aria-describedby="simple-form-name-01-helper"
            validated={token.error ? ValidatedOptions.error : ValidatedOptions.default}
            onChange={(value) => {
              const tokens = data.tokens?.map((item) =>
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
        </SplitItem>
        <SplitItem>
          <Button
            variant="plain"
            icon={<MinusCircleIcon />}
            onClick={() => {
              setData(
                'tokens',
                data.tokens.filter((item) => item.uuid !== token.uuid),
              );
            }}
          />
        </SplitItem>
      </Split>
    </FormGroup>
  );
};

export default ServingRuntimeTokenInput;

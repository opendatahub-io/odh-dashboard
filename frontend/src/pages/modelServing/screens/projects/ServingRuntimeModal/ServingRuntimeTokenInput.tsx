import * as React from 'react';
import {
  Alert,
  Button,
  FormGroup,
  Split,
  SplitItem,
  Stack,
  StackItem,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from 'pages/projects/types';
import { CreatingServingRuntimeObject, ServingRuntimeToken } from '../../types';
import { ExclamationCircleIcon, MinusCircleIcon } from '@patternfly/react-icons';
import { translateDisplayNameForK8s } from 'pages/projects/utils';

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
    } else {
      return '';
    }
  };

  return (
    <Stack hasGutter>
      <StackItem>
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
      </StackItem>
      <StackItem>
        <Alert
          variant="info"
          isInline
          title="The actual token will be created and displayed when the model server is configured."
        />
      </StackItem>
    </Stack>
  );
};

export default ServingRuntimeTokenInput;

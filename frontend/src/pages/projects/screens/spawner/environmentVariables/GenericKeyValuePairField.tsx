import * as React from 'react';
import {
  Button,
  Divider,
  FormGroup,
  Split,
  SplitItem,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { EnvVariableDataEntry } from '~/pages/projects/types';
import PasswordInput from '~/pages/projects/components/PasswordInput';
import { EMPTY_KEY_VALUE_PAIR } from './const';
import { removeArrayItem, updateArrayValue } from './utils';

type GenericKeyValuePairFieldProps = {
  values: EnvVariableDataEntry[];
  onUpdate: (data: EnvVariableDataEntry[]) => void;
  valueIsSecret?: boolean;
};

const GenericKeyValuePairField: React.FC<GenericKeyValuePairFieldProps> = ({
  values,
  onUpdate,
  valueIsSecret,
}) => {
  const ValueComponent = valueIsSecret ? PasswordInput : TextInput;

  return (
    <Stack hasGutter>
      <StackItem>
        <Stack hasGutter>
          {values.map(({ key, value }, i) => (
            <StackItem key={i}>
              <Split>
                <SplitItem isFilled>
                  <Stack hasGutter>
                    <StackItem>
                      <FormGroup isRequired label="Key" fieldId="label">
                        <TextInput
                          isRequired
                          aria-label={`key of item ${i}`}
                          value={key}
                          onChange={(updatedKey) =>
                            onUpdate(updateArrayValue(values, i, { key: updatedKey }))
                          }
                        />
                      </FormGroup>
                    </StackItem>
                    <StackItem>
                      <FormGroup isRequired label="Value" fieldId="label">
                        <ValueComponent
                          isRequired
                          aria-label={`value of item ${i}`}
                          value={value}
                          onChange={(updatedValue) =>
                            onUpdate(updateArrayValue(values, i, { value: updatedValue }))
                          }
                        />
                      </FormGroup>
                    </StackItem>
                    {i !== values.length - 1 && (
                      <StackItem>
                        <Divider />
                      </StackItem>
                    )}
                  </Stack>
                </SplitItem>
                <SplitItem style={{ paddingTop: 'var(--pf-global--spacer--xl)' }}>
                  <Button
                    isDisabled={values.length === 1}
                    aria-label="Remove key-value pair"
                    variant="plain"
                    icon={<MinusCircleIcon />}
                    onClick={() => onUpdate(removeArrayItem(values, i))}
                  />
                </SplitItem>
              </Split>
            </StackItem>
          ))}
        </Stack>
      </StackItem>
      <StackItem>
        <Button
          variant="link"
          isInline
          icon={<PlusCircleIcon />}
          iconPosition="left"
          onClick={() => onUpdate([...values, EMPTY_KEY_VALUE_PAIR])}
        >
          Add another key / value pair
        </Button>
      </StackItem>
    </Stack>
  );
};

export default GenericKeyValuePairField;

import * as React from 'react';
import {
  Button,
  ButtonVariant,
  HelperText,
  HelperTextItem,
  InputGroup,
  InputGroupText,
  InputGroupTextVariant,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import SettingSection from '~/components/SettingSection';
import { DEFAULT_PVC_SIZE, MAX_PVC_SIZE, MIN_PVC_SIZE } from './const';

type PVCSizeSettingsProps = {
  initialValue: number | string;
  pvcSize: number | string;
  setPvcSize: (size: number | string) => void;
};

const PVCSizeSettings: React.FC<PVCSizeSettingsProps> = ({ initialValue, pvcSize, setPvcSize }) => {
  React.useEffect(() => {
    setPvcSize(initialValue);
  }, [initialValue, setPvcSize]);

  return (
    <SettingSection
      title="PVC size"
      description="Changing the PVC size changes the storage size attached to the new notebook servers for
all users."
    >
      <Stack hasGutter>
        <StackItem>
          <InputGroup>
            <TextInput
              id="pvc-size-input"
              style={{ maxWidth: '200px' }}
              name="pvc"
              data-id="pvc-size-input"
              type="text"
              aria-label="PVC Size Input"
              value={pvcSize}
              pattern="/^(\s*|\d+)$/"
              onChange={async (value: string) => {
                const modifiedValue = value.replace(/ /g, '');
                if (modifiedValue !== '') {
                  let newValue = Number.isInteger(Number(modifiedValue))
                    ? Number(modifiedValue)
                    : pvcSize;
                  newValue =
                    newValue > MAX_PVC_SIZE
                      ? MAX_PVC_SIZE
                      : newValue < MIN_PVC_SIZE
                      ? MIN_PVC_SIZE
                      : newValue;
                  setPvcSize(newValue);
                } else {
                  setPvcSize(modifiedValue);
                }
              }}
            />
            <InputGroupText variant={InputGroupTextVariant.plain}>GiB</InputGroupText>
          </InputGroup>
        </StackItem>
        <StackItem>
          <Button
            data-id="restore-default-button"
            variant={ButtonVariant.secondary}
            onClick={() => {
              setPvcSize(DEFAULT_PVC_SIZE);
            }}
          >
            Restore Default
          </Button>
        </StackItem>
        <StackItem>
          <HelperText>
            <HelperTextItem
              data-id="pvc-size-helper-text"
              variant={pvcSize === '' ? 'error' : 'indeterminate'}
              hasIcon={pvcSize === ''}
            >
              Note: PVC size must be between 1 GiB and 16384 GiB.
            </HelperTextItem>
          </HelperText>
        </StackItem>
      </Stack>
    </SettingSection>
  );
};

export default PVCSizeSettings;

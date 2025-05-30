import * as React from 'react';
import {
  Button,
  ButtonVariant,
  HelperText,
  HelperTextItem,
  InputGroup,
  InputGroupText,
  Stack,
  StackItem,
  TextInput,
  InputGroupItem,
} from '@patternfly/react-core';
import SettingSection from '#~/components/SettingSection';
import { DEFAULT_PVC_SIZE, MAX_PVC_SIZE, MIN_PVC_SIZE } from './const';

type PVCSizeSettingsProps = {
  initialValue: number;
  pvcSize: number;
  setPvcSize: (size: number) => void;
};

const PVCSizeSettings: React.FC<PVCSizeSettingsProps> = ({ initialValue, pvcSize, setPvcSize }) => {
  React.useEffect(() => {
    setPvcSize(initialValue);
  }, [initialValue, setPvcSize]);

  return (
    <SettingSection
      title="PVC size"
      description="Changing the PVC size will affect the storage size attached to new workbenches only, for all users."
    >
      <Stack hasGutter>
        <StackItem>
          <InputGroup>
            <InputGroupItem>
              <TextInput
                id="pvc-size-input"
                style={{ maxWidth: '200px' }}
                name="pvc"
                data-testid="pvc-size-input"
                type="text"
                aria-label="PVC Size Input"
                value={pvcSize}
                pattern="/^(\s*|\d+)$/"
                onChange={async (e, value: string) => {
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
                    setPvcSize(0);
                  }
                }}
              />
            </InputGroupItem>
            <InputGroupText isPlain>GiB</InputGroupText>
          </InputGroup>
        </StackItem>
        <StackItem>
          <Button
            data-testid="restore-default-button"
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
              data-testid="pvc-size-helper-text"
              variant={!pvcSize ? 'error' : 'default'}
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

import * as React from 'react';
import { Checkbox, Stack, StackItem } from '@patternfly/react-core';
import SettingSection from '~/components/SettingSection';

type InstructLabSettingsProps = {
  initialValue: boolean;
  enabled: boolean;
  setEnabled: (settings: boolean) => void;
};

const InstructLabSettings: React.FC<InstructLabSettingsProps> = ({
  initialValue,
  enabled,
  setEnabled,
}) => {
  React.useEffect(() => {
    if (initialValue) {
      setEnabled(initialValue);
    }
  }, [initialValue, setEnabled]);

  return (
    <SettingSection title="InstrutLab pipeline">
      <Stack hasGutter>
        <StackItem>
          <Checkbox
            label="InstructLab flow for all Data Science Projects"
            isChecked={enabled}
            onChange={() => {
              setEnabled(!enabled);
            }}
            aria-label="instructLabEnabledCheckbox"
            id="instructlab-enabled-checkbox"
            data-testid="instructlab-enabled-checkbox"
            name="instructLabEnabledCheckbox"
          />
        </StackItem>
      </Stack>
    </SettingSection>
  );
};

export default InstructLabSettings;
